"use client";

import { useState } from "react";
import type { ModelOption } from "@/hooks/use-models";
import AuthPrompt from "./auth-prompt";

export interface BrandData {
  colors: string[];
  personality: string[];
  visualStyle: string[];
  tone: string;
  stylePrompt: string;
  customSystemPrompt?: string;
  generatedByModel?: string;
}

export function buildSystemPrompt(data: BrandData): string {
  return [
    "The user wants the generated image to match a specific brand identity. Apply the following brand guidelines to the image:",
    "",
    `Visual style: ${data.stylePrompt}`,
    `Color palette: ${data.colors?.join(", ")}`,
    `Personality: ${data.personality?.join(", ")}`,
    `Visual descriptors: ${data.visualStyle?.join(", ")}`,
    "",
    "Incorporate these brand elements naturally into the image. The user's prompt below describes what to generate — the brand context above describes how it should look and feel.",
  ].join("\n");
}

type MoodMode = "url" | "prompt";

export default function Moodboard({
  apiKey,
  brandData,
  onBrandData,
  moodModel,
  onMoodModelChange,
  textModels,
}: {
  apiKey: string | null;
  brandData: BrandData | null;
  onBrandData: (data: BrandData | null) => void;
  moodModel: string;
  onMoodModelChange: (model: string) => void;
  textModels: ModelOption[];
}) {
  const [mode, setMode] = useState<MoodMode>("url");
  const [url, setUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptDraft, setPromptDraft] = useState("");

  const inputValue = mode === "url" ? url : prompt;
  const isDisabled = loading || !inputValue.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inputValue.trim()) return;

    if (!apiKey) {
      setShowAuthPrompt(true);
      return;
    }

    setShowAuthPrompt(false);
    setLoading(true);
    setError(null);

    try {
      let cleanUrl = url.trim();
      if (mode === "url" && !/^https?:\/\//i.test(cleanUrl)) {
        cleanUrl = `https://${cleanUrl}`;
      }

      const body =
        mode === "url"
          ? { url: cleanUrl, model: moodModel }
          : { prompt: prompt.trim(), model: moodModel };

      const res = await fetch("/api/moodboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to analyze brand");
      }

      const data: BrandData = await res.json();
      onBrandData({ ...data, generatedByModel: moodModel });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const generatedModelId = brandData?.generatedByModel ?? moodModel;
  const generatedModelLabel = textModels.find((m) => m.id === generatedModelId)?.label ?? generatedModelId;

  return (
    <div className="space-y-4">
      {!brandData && (
        <>
          {/* Mode toggle */}
          <div className="flex gap-1 p-1 bg-surface border border-border rounded-lg w-fit">
            <button
              type="button"
              onClick={() => setMode("url")}
              className={`px-4 py-1.5 text-xs font-medium tracking-wide rounded-md transition-all cursor-pointer ${
                mode === "url"
                  ? "bg-accent text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                  : "text-muted hover:text-foreground"
              }`}
            >
              From URL
            </button>
            <button
              type="button"
              onClick={() => setMode("prompt")}
              className={`px-4 py-1.5 text-xs font-medium tracking-wide rounded-md transition-all cursor-pointer ${
                mode === "prompt"
                  ? "bg-accent text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                  : "text-muted hover:text-foreground"
              }`}
            >
              From Prompt
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "url" ? (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted tracking-wide">Generate style from a website:</label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter a URL (e.g. openrouter.ai)"
                  className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-accent/60 focus:shadow-[0_0_10px_rgba(59,130,246,0.15)] transition-all"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted tracking-wide">Generate style from a prompt:</label>
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe a mood (e.g. warm sunset, retro 80s neon)"
                  className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-accent/60 focus:shadow-[0_0_10px_rgba(59,130,246,0.15)] transition-all"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted tracking-wide">with</span>
              <select
                value={moodModel}
                onChange={(e) => onMoodModelChange(e.target.value)}
                className="flex-1 px-3 py-2.5 bg-surface border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent/60 transition-all cursor-pointer"
              >
                {textModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={isDisabled}
                className="px-5 py-2.5 text-sm font-medium tracking-wide bg-accent hover:bg-accent-hover text-white rounded-lg transition-all hover:shadow-[0_0_12px_rgba(59,130,246,0.3)] disabled:opacity-40 cursor-pointer whitespace-nowrap"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="retro-spinner !w-3 !h-3 !border-[1.5px] !border-white/30 !border-t-white" />
                    Generating
                  </span>
                ) : (
                  "Generate Style"
                )}
              </button>
            </div>
          </form>

          {error && (() => {
            const isCredit = /insufficient.*credits|out of credits|not enough credits|credits.*required|payment required/i.test(error);
            return isCredit ? (
              <div className="flex items-center gap-2">
                <p className="text-sm text-yellow-400">{error}</p>
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
              <p className="text-sm text-red-400">{error}</p>
            );
          })()}

          {showAuthPrompt && <AuthPrompt onDismiss={() => setShowAuthPrompt(false)} />}
        </>
      )}

      {brandData && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted tracking-wide">
            Generated by <span className="text-accent">{generatedModelLabel}</span>
          </span>
          <button
            onClick={() => onBrandData(null)}
            className="text-xs text-red-400/80 hover:text-red-400 transition-colors cursor-pointer tracking-wide"
          >
            [Delete Mood]
          </button>
        </div>
      )}

      {brandData && (
        <div className="p-5 bg-surface/80 border border-border rounded-xl space-y-5">
          {/* Color palette */}
          <div>
            <h3 className="text-[10px] font-medium text-muted uppercase tracking-[0.15em] mb-2.5">
              Color Palette
            </h3>
            <div className="flex gap-3 flex-wrap">
              {brandData.colors.map((color, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg border border-border/60"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs text-muted/60">{color}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Personality */}
          <div>
            <h3 className="text-[10px] font-medium text-muted uppercase tracking-[0.15em] mb-2.5">
              Personality
            </h3>
            <div className="flex gap-2 flex-wrap">
              {brandData.personality.map((trait, i) => (
                <span
                  key={i}
                  className="px-3 py-1 text-xs bg-accent/10 text-accent border border-accent/20 rounded-lg tracking-wide"
                >
                  {trait}
                </span>
              ))}
            </div>
          </div>

          {/* Visual style */}
          <div>
            <h3 className="text-[10px] font-medium text-muted uppercase tracking-[0.15em] mb-2.5">
              Visual Style
            </h3>
            <div className="flex gap-2 flex-wrap">
              {brandData.visualStyle.map((style, i) => (
                <span
                  key={i}
                  className="px-3 py-1 text-xs bg-surface-hover text-foreground/80 border border-border rounded-lg tracking-wide"
                >
                  {style}
                </span>
              ))}
            </div>
          </div>

          {/* Tone */}
          <div>
            <h3 className="text-[10px] font-medium text-muted uppercase tracking-[0.15em] mb-2.5">
              Tone
            </h3>
            <p className="text-sm text-foreground/70 leading-relaxed">{brandData.tone}</p>
          </div>

          {/* System prompt */}
          <div className="p-4 border border-border/60 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-medium text-muted uppercase tracking-[0.15em]">
                Generated System Prompt
              </h3>
              {editingPrompt ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onBrandData({ ...brandData, customSystemPrompt: promptDraft });
                      setEditingPrompt(false);
                    }}
                    className="text-xs text-accent hover:text-accent-hover transition-colors cursor-pointer tracking-wide"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingPrompt(false)}
                    className="text-xs text-muted hover:text-foreground transition-colors cursor-pointer tracking-wide"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setPromptDraft(brandData.customSystemPrompt ?? buildSystemPrompt(brandData));
                    setEditingPrompt(true);
                  }}
                  className="text-xs text-muted hover:text-accent transition-colors cursor-pointer tracking-wide"
                >
                  [Edit]
                </button>
              )}
            </div>
            {editingPrompt ? (
              <textarea
                value={promptDraft}
                onChange={(e) => setPromptDraft(e.target.value)}
                rows={8}
                className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent/60 focus:shadow-[0_0_10px_rgba(59,130,246,0.15)] transition-all resize-y"
              />
            ) : (
              <p className="text-sm text-foreground/60 whitespace-pre-wrap leading-relaxed">
                {brandData.customSystemPrompt ?? buildSystemPrompt(brandData)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
