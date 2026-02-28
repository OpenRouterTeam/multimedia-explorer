"use client";

import { useState, useEffect, useCallback } from "react";
import AuthButton from "@/components/auth-button";
import type { BrandData } from "@/components/moodboard";
import AccordionCards from "@/components/accordion-cards";
import GenerateForm from "@/components/generate-form";
import ImageResult from "@/components/image-result";
import HistoryTimeline from "@/components/history-timeline";
import { MODELS, type ReferenceImage, type HistoryEntry } from "@/lib/types";
import { saveImage, loadImage, deleteImages, clearAllImages } from "@/lib/history-db";

const HISTORY_KEY = "generation_history";
const MAX_HISTORY = 50;

/** Strip base64 data URLs from reference images before persisting to localStorage */
function stripDataUrls(images: ReferenceImage[]): ReferenceImage[] {
  return images
    .filter((img) => !img.url.startsWith("data:"))
    .map((img) => ({ ...img }));
}

export default function Home() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [brandData, setBrandData] = useState<BrandData | null>(null);
  const [model, setModel] = useState(MODELS[0].id);
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [resolution, setResolution] = useState("1K");
  const [prompt, setPrompt] = useState("");
  const [imageResult, setImageResult] = useState<{
    imageUrl: string;
    model: string;
  } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Snapshot of "current" working state to return to after browsing history
  const [savedCurrent, setSavedCurrent] = useState<{
    prompt: string;
    brandData: BrandData | null;
    model: string;
    referenceImages: ReferenceImage[];
    aspectRatio: string;
    resolution: string;
    imageResult: { imageUrl: string; model: string } | null;
  } | null>(null);

  useEffect(() => {
    const envKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
    if (envKey) {
      setApiKey(envKey);
    } else {
      const storedKey = localStorage.getItem("openrouter_api_key");
      if (storedKey) setApiKey(storedKey);
    }

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
            const url = await loadImage(entry.id);
            return { ...entry, imageUrl: url ?? undefined };
          }),
        ).then((hydrated) => {
          setHistory(hydrated.filter((e) => e.imageUrl));
        });
      } catch {}
    }
  }, []);

  function persistHistory(entries: HistoryEntry[]) {
    setHistory(entries);
    // Strip imageUrl before saving to localStorage (images live in IndexedDB)
    const toStore = entries.map(({ imageUrl: _img, referenceImages: refs, ...rest }) => ({
      ...rest,
      referenceImages: stripDataUrls(refs),
    }));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(toStore));
  }

  function handleLogin(key: string) {
    localStorage.setItem("openrouter_api_key", key);
    setApiKey(key);
  }

  function handleLogout() {
    localStorage.removeItem("openrouter_api_key");
    setApiKey(null);
    setBrandData(null);
    setImageResult(null);
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
    // Clear localStorage
    localStorage.removeItem("openrouter_api_key");
    localStorage.removeItem("moodboard_data");
    localStorage.removeItem(HISTORY_KEY);

    // Clear IndexedDB
    clearAllImages().catch(console.error);

    // Reset all state
    setApiKey(null);
    setBrandData(null);
    setModel(MODELS[0].id);
    setReferenceImages([]);
    setAspectRatio("1:1");
    setResolution("1K");
    setPrompt("");
    setImageResult(null);
    setGenerating(false);
    setHistory([]);
    setSavedCurrent(null);
    setShowDeleteConfirm(false);
  }

  const handleResult = useCallback(
    (result: { imageUrl: string; model: string } | null) => {
      setImageResult(result);
      if (result) {
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

  function handleSelectHistory(entry: HistoryEntry) {
    if (!entry.imageUrl) return;

    // Save current working state on first history browse
    if (!savedCurrent) {
      setSavedCurrent({
        prompt,
        brandData,
        model,
        referenceImages,
        aspectRatio,
        resolution,
        imageResult,
      });
    }

    setPrompt(entry.prompt);
    handleBrandData(entry.brandData);
    setModel(entry.model);
    setReferenceImages(entry.referenceImages);
    setAspectRatio(entry.aspectRatio);
    setResolution(entry.resolution);
    setImageResult({ imageUrl: entry.imageUrl, model: entry.model });
  }

  function handleReturnToCurrent() {
    if (savedCurrent) {
      setPrompt(savedCurrent.prompt);
      handleBrandData(savedCurrent.brandData);
      setModel(savedCurrent.model);
      setReferenceImages(savedCurrent.referenceImages);
      setAspectRatio(savedCurrent.aspectRatio);
      setResolution(savedCurrent.resolution);
      setImageResult(savedCurrent.imageResult);
      setSavedCurrent(null);
    }
  }

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
            <h1 className="text-lg font-heading font-semibold">
              Media Playground
            </h1>
          </div>

          <AuthButton
            apiKey={apiKey}
            onLogin={handleLogin}
            onLogout={handleLogout}
          />
        </div>
      </header>

      {/* Main content with timeline sidebar */}
      <div className="max-w-4xl mx-auto px-4 py-8 flex gap-4">
        {/* Timeline */}
        <div className="shrink-0 w-8">
          <HistoryTimeline
            entries={history}
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
              onAuthNeeded={handleLogin}
              model={model}
              onModelChange={setModel}
              referenceImages={referenceImages}
              onReferenceImagesChange={setReferenceImages}
              aspectRatio={aspectRatio}
              onAspectRatioChange={setAspectRatio}
              resolution={resolution}
              onResolutionChange={setResolution}
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
                onAuthNeeded={handleLogin}
              />
            </section>

            {/* Result section */}
            {(imageResult || generating) && (
              <section className="p-6 bg-surface/50 border border-border rounded-xl">
                <ImageResult
                  result={imageResult}
                  loading={generating}
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
          <span>
            Built with{" "}
            <a
              href="https://openrouter.ai"
              className="text-accent hover:text-accent-hover transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              OpenRouter
            </a>
          </span>
          <span className="flex items-center gap-3">
            <span>
              All data is stored on your machine.{" "}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-400 hover:text-red-300 transition-colors cursor-pointer underline"
              >
                Delete Data
              </button>
            </span>
            <a
              href="https://github.com/openrouter"
              className="hover:text-foreground transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </span>
        </div>
      </footer>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface border border-border rounded-xl p-6 max-w-sm mx-4 space-y-4">
            <h3 className="text-sm font-heading font-semibold">Delete all data?</h3>
            <p className="text-xs text-muted">
              This will permanently delete all your settings, API key, moodboard data, and generation history. This cannot be undone.
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
    </div>
  );
}
