"use client";

import { useState, useEffect, useCallback } from "react";
import { SignInButton } from "@/components/auth-button";
import { useOpenRouterAuth } from "@/hooks/use-openrouter-auth";
import type { BrandData } from "@/components/moodboard";
import AccordionCards from "@/components/accordion-cards";
import GenerateForm from "@/components/generate-form";
import ImageResult from "@/components/image-result";
import HistoryTimeline from "@/components/history-timeline";
import {
  MOOD_MODELS,
  EXTENDED_ASPECT_RATIOS,
  getVideoConfig,
  type ReferenceImage,
  type HistoryEntry,
  type MediaResult,
} from "@/lib/types";
import { useModels } from "@/hooks/use-models";
import { useVideoGeneration } from "@/hooks/use-video-generation";
import {
  saveImage,
  loadImage,
  deleteImages,
  clearAllImages,
} from "@/lib/history-db";

const HISTORY_KEY = "generation_history";
const MAX_HISTORY = 50;
const DRAFT_STATE_KEY = "draft_form_state";

/** Replace data URLs with empty strings before persisting to localStorage (data lives in IndexedDB) */
function stripDataUrls(images: ReferenceImage[]): ReferenceImage[] {
  return images.map((img) => ({
    ...img,
    url: img.url.startsWith("data:") ? "" : img.url,
  }));
}

export default function Home() {
  const { apiKey: authApiKey, signOut } = useOpenRouterAuth();
  const envKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY ?? null;
  const apiKey = envKey || authApiKey;
  const { imageModels, videoModels, loading: modelsLoading } = useModels();
  const [brandData, setBrandData] = useState<BrandData | null>(null);
  const [moodModel, setMoodModel] = useState(MOOD_MODELS[0].id);
  const [model, setModel] = useState("");
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [resolution, setResolution] = useState("1K");
  const [prompt, setPrompt] = useState("");
  const [mediaResult, setMediaResult] = useState<MediaResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [showWhatIsThis, setShowWhatIsThis] = useState(false);
  const [duration, setDuration] = useState(5);
  const [generateAudio, setGenerateAudio] = useState(false);

  const isVideoModel = videoModels.some((m) => m.id === model);

  const {
    state: videoState,
    submit: submitVideo,
    reset: resetVideo,
  } = useVideoGeneration(apiKey);

  // When video generation completes, set the result
  useEffect(() => {
    if (videoState.status === "completed" && videoState.videoUrl) {
      const result: MediaResult = {
        type: "video",
        videoUrl: videoState.videoUrl,
        model: videoState.model ?? model,
      };
      setMediaResult(result);
      handleVideoResult(result);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoState.status, videoState.videoUrl]);

  // Snapshot of "current" working state to return to after browsing history
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [savedCurrent, setSavedCurrent] = useState<{
    prompt: string;
    brandData: BrandData | null;
    model: string;
    referenceImages: ReferenceImage[];
    aspectRatio: string;
    resolution: string;
    mediaResult: MediaResult | null;
  } | null>(null);

  // Auto-select first image model once loaded (if no model set yet)
  useEffect(() => {
    if (!model && imageModels.length > 0) {
      setModel(imageModels[0].id);
    }
  }, [imageModels, model]);

  // Persist draft form state to sessionStorage so it survives OAuth redirects
  useEffect(() => {
    // Only persist once we have a meaningful state (prompt or model set)
    if (!prompt && !model) return;
    const draft = { prompt, model, aspectRatio, resolution, duration, generateAudio };
    sessionStorage.setItem(DRAFT_STATE_KEY, JSON.stringify(draft));
  }, [prompt, model, aspectRatio, resolution, duration, generateAudio]);

  // Restore draft state after returning from OAuth redirect
  useEffect(() => {
    const saved = sessionStorage.getItem(DRAFT_STATE_KEY);
    if (!saved) return;
    try {
      const draft = JSON.parse(saved);
      if (draft.prompt) setPrompt(draft.prompt);
      if (draft.model) setModel(draft.model);
      if (draft.aspectRatio) setAspectRatio(draft.aspectRatio);
      if (draft.resolution) setResolution(draft.resolution);
      if (draft.duration) setDuration(draft.duration);
      if (draft.generateAudio !== undefined) setGenerateAudio(draft.generateAudio);
    } catch {}
    sessionStorage.removeItem(DRAFT_STATE_KEY);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("has_seen_intro")) {
      setShowWhatIsThis(true);
    }

    const storedMoodModel = localStorage.getItem("mood_model");
    if (storedMoodModel) setMoodModel(storedMoodModel);

    const storedBrand = localStorage.getItem("moodboard_data");
    if (storedBrand) {
      try {
        setBrandData(JSON.parse(storedBrand));
      } catch {}
    }

    // Load history metadata from localStorage, then hydrate image URLs from IndexedDB
    const storedHistory = localStorage.getItem(HISTORY_KEY);
    if (storedHistory) {
      try {
        const parsed: HistoryEntry[] = JSON.parse(storedHistory);
        setHistory(parsed);
        // Hydrate imageUrl and reference image data URLs from IndexedDB
        Promise.all(
          parsed.map(async (entry) => {
            // Hydrate reference images that were stripped to empty URLs
            const hydratedRefs = await Promise.all(
              entry.referenceImages.map(async (ref) => {
                if (ref.url) return ref; // Already has a URL (e.g. remote)
                const url = await loadImage(`ref-${ref.id}`);
                return url ? { ...ref, url } : ref;
              }),
            );
            const refsWithUrls = hydratedRefs.filter((ref) => ref.url);

            if (entry.mediaType === "video") {
              return { ...entry, referenceImages: refsWithUrls };
            }
            const url = await loadImage(entry.id);
            return { ...entry, imageUrl: url ?? undefined, referenceImages: refsWithUrls };
          }),
        ).then((hydrated) => {
          setHistory(hydrated.filter((e) => e.imageUrl || (e.mediaType === "video" && e.videoJobId)));
        });
      } catch {}
    }

  }, []);

  function dismissIntro() {
    setShowWhatIsThis(false);
    localStorage.setItem("has_seen_intro", "1");
  }

  function persistHistory(entries: HistoryEntry[]) {
    setHistory(entries);
    // Strip imageUrl before saving to localStorage (images live in IndexedDB)
    const toStore = entries.map(
      ({ imageUrl: _img, referenceImages: refs, ...rest }) => ({
        ...rest,
        referenceImages: stripDataUrls(refs),
      }),
    );
    localStorage.setItem(HISTORY_KEY, JSON.stringify(toStore));
  }

  function handleLogout() {
    signOut();
  }

  function handleMoodModelChange(m: string) {
    setMoodModel(m);
    localStorage.setItem("mood_model", m);
  }

  function handleModelChange(newModel: string) {
    const wasVideo = isVideoModel;
    const willBeVideo = videoModels.some((m) => m.id === newModel);

    setModel(newModel);

    // Reset output settings when switching between image and video
    if (wasVideo !== willBeVideo) {
      if (willBeVideo) {
        const config = getVideoConfig(newModel);
        setAspectRatio(config.aspectRatios[0]);
        setResolution(config.resolutions.includes("720p") ? "720p" : config.resolutions[0]);
        setDuration(config.durations[0]);
      } else {
        setAspectRatio("1:1");
        setResolution("1K");
      }
      resetVideo();
    } else if (willBeVideo) {
      // Switching between video models — reset to valid values for new model
      const config = getVideoConfig(newModel);
      if (!config.durations.includes(duration)) setDuration(config.durations[0]);
      if (!config.resolutions.includes(resolution)) setResolution(config.resolutions.includes("720p") ? "720p" : config.resolutions[0]);
      if (!config.aspectRatios.includes(aspectRatio)) setAspectRatio(config.aspectRatios[0]);
    }

    if (!willBeVideo && EXTENDED_ASPECT_RATIOS.includes(aspectRatio)) {
      setAspectRatio("1:1");
    }

    // Force audio on for models that require it (e.g. Sora)
    if (willBeVideo) {
      const config = getVideoConfig(newModel);
      if (config.requiresAudio) setGenerateAudio(true);
    }
  }

  function handleBrandData(data: BrandData | null) {
    setBrandData(data);
    if (data) {
      localStorage.setItem("moodboard_data", JSON.stringify(data));
    } else {
      localStorage.removeItem("moodboard_data");
    }
  }

  function handleDeleteAllData() {
    // Clear auth via hook (notifies listeners / other tabs)
    signOut();

    // Clear other localStorage
    localStorage.removeItem("moodboard_data");
    localStorage.removeItem("mood_model");
    localStorage.removeItem(HISTORY_KEY);

    // Clear IndexedDB
    clearAllImages().catch(console.error);

    // Reset all state
    setBrandData(null);
    setMoodModel(MOOD_MODELS[0].id);
    setModel(imageModels[0]?.id ?? "");
    setReferenceImages([]);
    setAspectRatio("1:1");
    setResolution("1K");
    setPrompt("");
    setMediaResult(null);
    setGenerating(false);
    setHistory([]);
    setSavedCurrent(null);
    setShowDeleteConfirm(false);
    resetVideo();
  }

  function handleVideoResult(result: MediaResult) {
    // Clear any saved "current" snapshot since we have a new generation
    setSavedCurrent(null);

    const id = crypto.randomUUID();
    const entry: HistoryEntry = {
      id,
      timestamp: Date.now(),
      model: result.model,
      prompt: prompt.trim(),
      brandData,
      referenceImages,
      aspectRatio,
      resolution,
      mediaType: "video",
      duration,
      generateAudio,
      videoJobId: videoState.jobId ?? undefined,
    };

    // Save data-URL reference images to IndexedDB
    for (const ref of referenceImages) {
      if (ref.url.startsWith("data:")) {
        saveImage(`ref-${ref.id}`, ref.url).catch(console.error);
      }
    }

    const newHistory = [entry, ...history].slice(0, MAX_HISTORY);
    persistHistory(newHistory);
  }

  const handleResult = useCallback(
    (result: MediaResult | null) => {
      setMediaResult(result);
      if (result && result.type === "image") {
        // Clear any saved "current" snapshot since we have a new generation
        setSavedCurrent(null);

        const id = crypto.randomUUID();
        const entry: HistoryEntry = {
          id,
          timestamp: Date.now(),
          imageUrl: result.imageUrl,
          model: result.model,
          prompt: prompt.trim(),
          brandData,
          referenceImages,
          aspectRatio,
          resolution,
          mediaType: "image",
        };

        const newHistory = [entry, ...history].slice(0, MAX_HISTORY);

        // Save image to IndexedDB
        saveImage(id, result.imageUrl).catch(console.error);

        // Save data-URL reference images to IndexedDB
        for (const ref of referenceImages) {
          if (ref.url.startsWith("data:")) {
            saveImage(`ref-${ref.id}`, ref.url).catch(console.error);
          }
        }

        // Clean up evicted entries from IndexedDB (output images + reference images)
        const evicted = history.slice(MAX_HISTORY - 1);
        if (evicted.length > 0) {
          const evictedIds = evicted.flatMap((e) => [
            e.id,
            ...e.referenceImages.map((ref) => `ref-${ref.id}`),
          ]);
          deleteImages(evictedIds).catch(console.error);
        }

        persistHistory(newHistory);
      }
    },
    [prompt, brandData, referenceImages, aspectRatio, resolution, history],
  );

  function handleVideoSubmit(params: {
    model: string;
    prompt: string;
    aspect_ratio: string;
    duration: number;
    resolution: string;
    generate_audio: boolean;
    input_references?: Array<{ type: "image_url"; image_url: { url: string } }>;
  }) {
    setMediaResult(null);
    submitVideo(params);
  }

  async function handleSelectHistory(entry: HistoryEntry) {
    if (!entry.imageUrl && !(entry.mediaType === "video" && entry.videoJobId)) return;

    // Save current working state on first history browse
    if (!savedCurrent) {
      setSavedCurrent({
        prompt,
        brandData,
        model,
        referenceImages,
        aspectRatio,
        resolution,
        mediaResult,
      });
    }

    setPrompt(entry.prompt);
    handleBrandData(entry.brandData);
    setModel(entry.model);
    setReferenceImages(entry.referenceImages);
    setAspectRatio(entry.aspectRatio);
    setResolution(entry.resolution);
    setActiveHistoryId(entry.id);

    if (entry.mediaType === "video" && entry.videoJobId && apiKey) {
      // Try to load the video from the stored job ID
      setMediaResult(null);
      setLoadingVideo(true);
      try {
        const res = await fetch(
          `/api/video/${entry.videoJobId}/content?index=0`,
          { headers: { Authorization: `Bearer ${apiKey}` } },
        );
        if (!res.ok) throw new Error("expired");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setMediaResult({ type: "video", videoUrl: url, model: entry.model });
      } catch {
        setMediaResult({ type: "video", videoUrl: "", model: entry.model });
      } finally {
        setLoadingVideo(false);
      }
    } else if (entry.mediaType === "video") {
      setMediaResult({ type: "video", videoUrl: "", model: entry.model });
    } else if (entry.imageUrl) {
      setMediaResult({ type: "image", imageUrl: entry.imageUrl, model: entry.model });
    }
  }

  function handleReturnToCurrent() {
    if (savedCurrent) {
      setPrompt(savedCurrent.prompt);
      handleBrandData(savedCurrent.brandData);
      setModel(savedCurrent.model);
      setReferenceImages(savedCurrent.referenceImages);
      setAspectRatio(savedCurrent.aspectRatio);
      setResolution(savedCurrent.resolution);
      setMediaResult(savedCurrent.mediaResult);
      setSavedCurrent(null);
      setActiveHistoryId(null);
    }
  }

  const isVideoGenerating =
    videoState.status === "submitting" ||
    videoState.status === "pending" ||
    videoState.status === "in_progress";

  const showResult = mediaResult || generating || isVideoGenerating || loadingVideo || videoState.status === "failed";

  return (
    <div className="min-h-screen bg-background relative">
      {/* Header */}
      <header className="border-b border-border/60">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center glow-accent-sm">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                className="text-accent"
              >
                {/* Film frame */}
                <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
                {/* Sprocket holes */}
                <rect x="4" y="4" width="2" height="3" rx="0.5" fill="currentColor" opacity="0.4" />
                <rect x="18" y="4" width="2" height="3" rx="0.5" fill="currentColor" opacity="0.4" />
                <rect x="4" y="17" width="2" height="3" rx="0.5" fill="currentColor" opacity="0.4" />
                <rect x="18" y="17" width="2" height="3" rx="0.5" fill="currentColor" opacity="0.4" />
                {/* Play triangle */}
                <path d="M10 9.5L16 12L10 14.5V9.5Z" fill="currentColor" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-heading font-bold tracking-tight text-glow-sm">
                Media Playground
              </h1>
              <p className="text-[11px] text-muted tracking-wide">
                Powered by{" "}
                <a
                  href="https://openrouter.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent/80 hover:text-accent transition-colors"
                >
                  OpenRouter
                </a>
                {" "}<span className="text-border">|</span>{" "}
                <span className="text-muted/60">multi-model media generation</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowWhatIsThis(true)}
              className="text-xs text-muted hover:text-accent transition-colors cursor-pointer tracking-wide"
            >
              [ ? ]
            </button>
            {apiKey ? (
              <button
                onClick={handleLogout}
                className="px-4 py-2.5 text-xs tracking-wide rounded-lg border border-border text-muted hover:text-foreground hover:border-accent/40 hover:shadow-[0_0_10px_rgba(59,130,246,0.1)] transition-all cursor-pointer"
              >
                Sign out
              </button>
            ) : (
              <SignInButton variant="default" size="sm" />
            )}
          </div>
        </div>
      </header>

      {/* Main content with timeline sidebar */}
      <div className="max-w-5xl mx-auto px-6 py-10 flex gap-6">
        {/* Timeline */}
        <div className="shrink-0 w-10">
          <HistoryTimeline
            entries={history}
            activeId={activeHistoryId}
            onSelect={handleSelectHistory}
            onReturnToCurrent={handleReturnToCurrent}
          />
        </div>

        {/* Page content */}
        <main className="flex-1 min-w-0">
          <div className="space-y-8">
            {/* Accordion cards */}
            <AccordionCards
              apiKey={apiKey}
              brandData={brandData}
              onBrandData={handleBrandData}
              moodModel={moodModel}
              onMoodModelChange={handleMoodModelChange}
              model={model}
              onModelChange={handleModelChange}
              imageModels={imageModels}
              videoModels={videoModels}
              modelsLoading={modelsLoading}
              referenceImages={referenceImages}
              onReferenceImagesChange={setReferenceImages}
              aspectRatio={aspectRatio}
              onAspectRatioChange={setAspectRatio}
              resolution={resolution}
              onResolutionChange={setResolution}
              isVideoModel={isVideoModel}
              duration={duration}
              onDurationChange={setDuration}
              generateAudio={generateAudio}
              onGenerateAudioChange={setGenerateAudio}
            />

            {/* Generate section */}
            <section className="p-6 bg-surface/80 backdrop-blur-sm border border-border rounded-xl hover:border-border transition-all">
              <GenerateForm
                apiKey={apiKey}
                brandData={brandData}
                model={model}
                referenceImages={referenceImages}
                aspectRatio={aspectRatio}
                resolution={resolution}
                prompt={prompt}
                onPromptChange={setPrompt}
                onResult={handleResult}
                onLoading={setGenerating}
                isVideoModel={isVideoModel}
                duration={duration}
                generateAudio={generateAudio}
                onVideoSubmit={handleVideoSubmit}
              />
            </section>

            {/* Result section */}
            {showResult && (
              <section className="p-6 bg-surface/80 backdrop-blur-sm border border-border rounded-xl">
                <ImageResult
                  result={mediaResult}
                  loading={generating}
                  loadingVideo={loadingVideo}
                  videoStatus={isVideoGenerating || videoState.status === "failed" ? videoState.status : undefined}
                  videoError={videoState.error}
                  onAddAsInputImage={(url) => {
                    const newRef = {
                      id: crypto.randomUUID(),
                      url,
                      name: `generation-${Date.now()}.png`,
                    };
                    if (savedCurrent) {
                      // Return to current working state and add the image there
                      setPrompt(savedCurrent.prompt);
                      handleBrandData(savedCurrent.brandData);
                      setModel(savedCurrent.model);
                      setReferenceImages([...savedCurrent.referenceImages, newRef]);
                      setAspectRatio(savedCurrent.aspectRatio);
                      setResolution(savedCurrent.resolution);
                      setMediaResult(savedCurrent.mediaResult);
                      setSavedCurrent(null);
                      setActiveHistoryId(null);
                    } else {
                      setReferenceImages((prev) => [...prev, newRef]);
                    }
                  }}
                />
              </section>
            )}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/40 mt-auto">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between text-xs text-muted tracking-wide">
          <a
            href="https://openrouter.ai/docs/sdks"
            className="hover:text-accent transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Built with the OpenRouter SDK
          </a>
          <a
            href="https://github.com/OpenRouterTeam/media-playground"
            className="hover:text-accent transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Fork on GitHub
          </a>
          <span>
            All data is stored locally.{" "}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-muted hover:text-red-400 transition-colors cursor-pointer"
            >
              [Delete Data]
            </button>
          </span>
        </div>
      </footer>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-xl p-8 max-w-sm mx-4 space-y-5 glow-accent-sm">
            <h3 className="text-sm font-heading font-bold tracking-tight text-glow-sm">
              // DELETE ALL DATA
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              This will permanently delete all your settings, API key, moodboard
              data, and generation history. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-xs tracking-wide border border-border rounded-lg hover:border-accent/40 hover:shadow-[0_0_8px_rgba(59,130,246,0.1)] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllData}
                className="px-4 py-2 text-xs tracking-wide bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 hover:shadow-[0_0_10px_rgba(239,68,68,0.2)] rounded-lg transition-all cursor-pointer"
              >
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}

      {/* What is this? modal */}
      {showWhatIsThis && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => dismissIntro()}
        >
          <div
            className="bg-surface border border-accent/30 rounded-xl p-8 max-w-lg mx-4 space-y-6 glow-accent-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-heading font-bold tracking-tight text-glow-sm">
                // MEDIA PLAYGROUND
              </h2>
              <button
                onClick={() => dismissIntro()}
                className="text-muted hover:text-accent transition-colors cursor-pointer -mt-1"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-muted leading-relaxed">
              <a
                href="https://openrouter.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:text-accent-hover transition-colors"
              >
                OpenRouter
              </a>{" "}
              lets you access text, image, and video generating models from a
              single API. This makes it easy to use many models together to
              generate media. Let&apos;s try it!
            </p>

            <div className="space-y-3">
              <h3 className="text-sm font-heading font-bold tracking-tight">
                // GET STARTED
              </h3>
              <ol className="space-y-3 text-sm text-muted leading-relaxed list-decimal list-inside">
                <li>
                  Choose{" "}
                  <span className="text-accent font-medium">
                    Nano Banana 2
                  </span>{" "}
                  as your model.
                </li>
                <li>
                  Click{" "}
                  <span className="text-accent font-medium">Set Mood</span>{" "}
                  and enter your company URL to pull in your brand colors and
                  style.
                </li>
                <li>Type a prompt to generate a superhero for your brand.</li>
                <li>
                  Click the button to add the image as an input. Then put your
                  superhero somewhere else. Perhaps on the moon?
                </li>
                <li>
                  Hover over the dots on the left to view your past generations.
                </li>
              </ol>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => dismissIntro()}
                className="px-5 py-2.5 text-sm font-medium tracking-wide bg-accent hover:bg-accent-hover text-white rounded-lg transition-all hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
