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
  VIDEO_DURATIONS,
  MODEL_DURATIONS,
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

/** Strip base64 data URLs from reference images before persisting to localStorage */
function stripDataUrls(images: ReferenceImage[]): ReferenceImage[] {
  return images
    .filter((img) => !img.url.startsWith("data:"))
    .map((img) => ({ ...img }));
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
        // Hydrate imageUrl from IndexedDB in background
        Promise.all(
          parsed.map(async (entry) => {
            if (entry.mediaType === "video") return entry; // Videos aren't persisted
            const url = await loadImage(entry.id);
            return { ...entry, imageUrl: url ?? undefined };
          }),
        ).then((hydrated) => {
          setHistory(hydrated.filter((e) => e.imageUrl || e.mediaType === "video"));
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
        setAspectRatio("16:9");
        setResolution("1080p");
        const durations = MODEL_DURATIONS[newModel] ?? VIDEO_DURATIONS;
        setDuration(durations[0]);
      } else {
        setAspectRatio("1:1");
        setResolution("1K");
      }
      resetVideo();
    } else if (willBeVideo) {
      // Switching between video models — reset duration if current is invalid
      const durations = MODEL_DURATIONS[newModel] ?? VIDEO_DURATIONS;
      if (!durations.includes(duration)) {
        setDuration(durations[0]);
      }
    }

    if (!willBeVideo && EXTENDED_ASPECT_RATIOS.includes(aspectRatio)) {
      setAspectRatio("1:1");
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
    };

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

        // Clean up evicted entries from IndexedDB
        const evicted = history.slice(MAX_HISTORY - 1);
        if (evicted.length > 0) {
          deleteImages(evicted.map((e) => e.id)).catch(console.error);
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

  function handleSelectHistory(entry: HistoryEntry) {
    if (!entry.imageUrl && entry.mediaType !== "video") return;

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

    if (entry.mediaType === "video") {
      // Video results aren't persisted — show metadata only
      setMediaResult(null);
    } else if (entry.imageUrl) {
      setMediaResult({ type: "image", imageUrl: entry.imageUrl, model: entry.model });
    }
    setActiveHistoryId(entry.id);
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

  const showResult = mediaResult || generating || isVideoGenerating || videoState.status === "failed";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="text-white"
              >
                <path
                  d="M2 4l6-3 6 3v8l-6 3-6-3V4z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 7v6M2 4l6 3 6-3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-heading font-semibold">
                Media Playground
              </h1>
              <p className="text-[10px] text-muted leading-tight">
                Powered by{" "}
                <a
                  href="https://openrouter.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  OpenRouter
                </a>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowWhatIsThis(true)}
              className="text-xs text-muted hover:text-foreground transition-colors cursor-pointer underline underline-offset-2"
            >
              What is this?
            </button>
            {apiKey ? (
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm rounded-lg border border-neutral-700 text-neutral-300 hover:text-white hover:border-neutral-500 transition-colors cursor-pointer"
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
      <div className="max-w-4xl mx-auto px-4 py-8 flex gap-4">
        {/* Timeline */}
        <div className="shrink-0 w-8">
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
            <section className="p-6 bg-surface/50 border border-border rounded-xl">
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
              <section className="p-6 bg-surface/50 border border-border rounded-xl">
                <ImageResult
                  result={mediaResult}
                  loading={generating}
                  videoStatus={isVideoGenerating || videoState.status === "failed" ? videoState.status : undefined}
                  videoError={videoState.error}
                  onAddAsInputImage={(url) =>
                    setReferenceImages((prev) => [
                      ...prev,
                      {
                        id: crypto.randomUUID(),
                        url,
                        name: `generation-${Date.now()}.png`,
                      },
                    ])
                  }
                />
              </section>
            )}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between text-xs text-muted">
          <a
            href="https://openrouter.ai/docs/sdks"
            className="hover:text-foreground transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Built with the OpenRouter SDK
          </a>
          <a
            href="https://github.com/OpenRouterTeam/media-playground"
            className="hover:text-foreground transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Fork on GitHub
          </a>
          <span>
            All data is stored on your machine.{" "}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="hover:text-foreground transition-colors cursor-pointer underline"
            >
              Delete Data
            </button>
          </span>
        </div>
      </footer>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface border border-border rounded-xl p-6 max-w-sm mx-4 space-y-4">
            <h3 className="text-sm font-heading font-semibold">
              Delete all data?
            </h3>
            <p className="text-xs text-muted">
              This will permanently delete all your settings, API key, moodboard
              data, and generation history. This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:border-accent/50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllData}
                className="px-3 py-1.5 text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors cursor-pointer"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => dismissIntro()}
        >
          <div
            className="bg-surface border border-border rounded-xl p-8 max-w-lg mx-4 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-heading font-semibold">
                Welcome to Media Playground
              </h2>
              <button
                onClick={() => dismissIntro()}
                className="text-muted hover:text-foreground transition-colors cursor-pointer -mt-1"
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
              lets you to access text, image, and video generating models from a
              single API. This makes it easy to use many models together to
              generate media. Let's try it!
            </p>

            <div className="space-y-3">
              <h3 className="text-sm font-heading font-semibold">
                Get started
              </h3>
              <ol className="space-y-3 text-sm text-muted leading-relaxed list-decimal list-inside">
                <li>
                  Choose{" "}
                  <span className="text-foreground font-medium">
                    Nano Banana 2
                  </span>{" "}
                  as your model.
                </li>
                <li>
                  Click{" "}
                  <span className="text-foreground font-medium">Set Mood</span>{" "}
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
                className="px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors cursor-pointer"
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
