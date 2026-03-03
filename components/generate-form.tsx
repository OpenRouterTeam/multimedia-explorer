"use client";

import { useState } from "react";
import type { BrandData } from "./moodboard";
import type { ReferenceImage } from "@/lib/types";
import { MOOD_MODELS } from "@/lib/types";
import AuthPrompt from "./auth-prompt";

export default function GenerateForm({
  apiKey,
  brandData,
  model,
  referenceImages,
  aspectRatio,
  resolution,
  prompt,
  onPromptChange,
  onResult,
  onLoading,
}: {
  apiKey: string | null;
  brandData: BrandData | null;
  model: string;
  referenceImages: ReferenceImage[];
  aspectRatio: string;
  resolution: string;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onResult: (result: { imageUrl: string; model: string } | null) => void;
  onLoading: (loading: boolean) => void;
}) {
  const [loading, setLoadingState] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [improveModel, setImproveModel] = useState(MOOD_MODELS[0].id);
  const [improving, setImproving] = useState(false);
  const [previousPrompt, setPreviousPrompt] = useState<string | null>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;

    if (!apiKey) {
      setShowAuthPrompt(true);
      return;
    }

    setShowAuthPrompt(false);
    setLoadingState(true);
    onLoading(true);
    setError(null);
    onResult(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          brandContext: brandData ?? undefined,
          model,
          aspectRatio,
          resolution,
          referenceImages: referenceImages.length > 0
            ? referenceImages.map((img) => img.url)
            : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate image");
      }

      onResult({ imageUrl: data.imageUrl, model: data.model });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoadingState(false);
      onLoading(false);
    }
  }

  async function handleImprovePrompt() {
    if (!prompt.trim()) return;

    if (!apiKey) {
      setShowAuthPrompt(true);
      return;
    }

    setImproving(true);
    setError(null);

    try {
      const res = await fetch("/api/improve-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model: improveModel,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to improve prompt");
      }

      setPreviousPrompt(prompt);
      onPromptChange(data.prompt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to improve prompt");
    } finally {
      setImproving(false);
    }
  }

  function handleUndo() {
    if (previousPrompt !== null) {
      onPromptChange(previousPrompt);
      setPreviousPrompt(null);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-heading font-semibold">Generate Image</h2>

      <form onSubmit={handleGenerate} className="space-y-3">
        {/* Prompt textarea */}
        <textarea
          value={prompt}
          onChange={(e) => {
            onPromptChange(e.target.value);
            // Clear undo when user manually edits
            if (previousPrompt !== null) setPreviousPrompt(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (prompt.trim() && !loading) {
                e.currentTarget.form?.requestSubmit();
              }
            }
          }}
          placeholder="Describe the image you want to generate..."
          rows={3}
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors resize-none"
        />

        {/* Bottom bar: Improve prompt (left) + Generate (right) */}
        <div className="flex items-center justify-between gap-3">
          {/* Improve prompt controls */}
          <div className="flex items-center gap-2">
            <select
              value={improveModel}
              onChange={(e) => setImproveModel(e.target.value)}
              className="px-2 py-1.5 bg-surface border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none focus:border-accent transition-colors cursor-pointer"
            >
              {MOOD_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleImprovePrompt}
              disabled={improving || !prompt.trim()}
              className="px-2.5 py-1.5 text-xs font-medium bg-surface border border-border rounded-lg hover:border-accent/50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {improving ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  Improving…
                </span>
              ) : (
                "Improve Prompt"
              )}
            </button>
            {previousPrompt !== null && (
              <button
                type="button"
                onClick={handleUndo}
                className="px-2.5 py-1.5 text-xs font-medium text-muted hover:text-foreground border border-border rounded-lg hover:border-accent/50 transition-colors cursor-pointer"
                title="Undo prompt improvement"
              >
                Undo
              </button>
            )}
          </div>

          {/* Generate button */}
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="flex items-center gap-2 px-4 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5Z" />
                </svg>
                Generate
              </>
            )}
          </button>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {showAuthPrompt && <AuthPrompt onDismiss={() => setShowAuthPrompt(false)} />}
      </form>
    </div>
  );
}
