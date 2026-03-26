"use client";

import { useState } from "react";
import type { BrandData } from "./moodboard";
import type { ReferenceImage, MediaResult } from "@/lib/types";
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
  isVideoModel,
  duration,
  generateAudio,
  onVideoSubmit,
}: {
  apiKey: string | null;
  brandData: BrandData | null;
  model: string;
  referenceImages: ReferenceImage[];
  aspectRatio: string;
  resolution: string;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onResult: (result: MediaResult | null) => void;
  onLoading: (loading: boolean) => void;
  isVideoModel: boolean;
  duration: number;
  generateAudio: boolean;
  onVideoSubmit: (params: {
    model: string;
    prompt: string;
    aspect_ratio: string;
    duration: number;
    resolution: string;
    generate_audio: boolean;
    input_references?: Array<{ type: "image_url"; image_url: { url: string } }>;
  }) => void;
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
    setError(null);

    if (isVideoModel) {
      // Video: delegate to parent's video submission handler
      const inputRefs =
        referenceImages.length > 0
          ? referenceImages.map((img) => ({
              type: "image_url" as const,
              image_url: { url: img.url },
            }))
          : undefined;

      onVideoSubmit({
        model,
        prompt: prompt.trim(),
        aspect_ratio: aspectRatio,
        duration,
        resolution,
        generate_audio: generateAudio,
        input_references: inputRefs,
      });
      return;
    }

    // Image generation (existing flow)
    setLoadingState(true);
    onLoading(true);
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

      onResult({ type: "image", imageUrl: data.imageUrl, model: data.model });
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

  const mediaType = isVideoModel ? "Video" : "Image";

  return (
    <div className="space-y-5">
      <h2 className="text-base font-heading font-bold tracking-tight text-glow-sm">
        // GENERATE {mediaType.toUpperCase()}
      </h2>

      <form onSubmit={handleGenerate} className="space-y-4">
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
          placeholder={
            isVideoModel
              ? "Describe the video you want to generate..."
              : "Describe the image you want to generate..."
          }
          rows={3}
          className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:border-accent/60 focus:shadow-[0_0_12px_rgba(59,130,246,0.15)] transition-all resize-none"
        />

        {/* Bottom bar: Improve prompt (left) + Generate (right) */}
        <div className="flex items-center justify-between gap-3">
          {/* Improve prompt controls */}
          <div className="flex items-center gap-2">
            <select
              value={improveModel}
              onChange={(e) => setImproveModel(e.target.value)}
              className="px-3 py-2 bg-surface border border-border rounded-lg text-xs text-muted focus:outline-none focus:border-accent/60 transition-all cursor-pointer"
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
              className="px-3 py-2 text-xs tracking-wide bg-surface border border-border rounded-lg hover:border-accent/40 hover:shadow-[0_0_8px_rgba(59,130,246,0.1)] transition-all disabled:opacity-40 cursor-pointer"
            >
              {improving ? (
                <span className="flex items-center gap-2">
                  <span className="retro-spinner !w-3 !h-3 !border-[1.5px]" />
                  Improving...
                </span>
              ) : (
                "Improve Prompt"
              )}
            </button>
            {previousPrompt !== null && (
              <button
                type="button"
                onClick={handleUndo}
                className="px-3 py-2 text-xs tracking-wide text-muted hover:text-accent border border-border rounded-lg hover:border-accent/40 transition-all cursor-pointer"
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
            className="flex items-center gap-2 px-6 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium tracking-wide rounded-lg transition-all hover:shadow-[0_0_15px_rgba(59,130,246,0.4)] disabled:opacity-40 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="retro-spinner !w-4 !h-4 !border-[1.5px] !border-white/30 !border-t-white" />
                Generating...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.303H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.142Z" clipRule="evenodd" />
                </svg>
                Generate {mediaType}
              </>
            )}
          </button>
        </div>

        {error && (() => {
          const isCredit = /insufficient.*credits|out of credits|not enough credits|credits.*required|payment required/i.test(error);
          return isCredit ? (
            <div className="flex items-center gap-2 px-4 py-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400 shrink-0">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <p className="text-sm text-yellow-400 flex-1">{error}</p>
              <a
                href="https://openrouter.ai/settings/credits"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 px-3 py-1.5 text-xs tracking-wide bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 border border-yellow-500/20 rounded-lg transition-all"
              >
                Add credits
              </a>
            </div>
          ) : (
            <div className="flex items-start gap-2 px-4 py-3 bg-red-500/5 border border-red-500/20 rounded-xl">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-sm text-red-400">{error}</p>
            </div>
          );
        })()}

        {showAuthPrompt && <AuthPrompt onDismiss={() => setShowAuthPrompt(false)} />}
      </form>
    </div>
  );
}
