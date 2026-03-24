"use client";

import { useState } from "react";
import { MOOD_MODELS } from "@/lib/types";
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
}: {
  apiKey: string | null;
  brandData: BrandData | null;
  onBrandData: (data: BrandData | null) => void;
  moodModel: string;
  onMoodModelChange: (model: string) => void;
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
  const generatedModelLabel = MOOD_MODELS.find((m) => m.id === generatedModelId)?.label ?? generatedModelId;

  return (
    <div className="space-y-4">
      {!brandData && (
        <>
          {/* Mode toggle */}
          <div className="flex gap-1 p-0.5 bg-surface border border-border rounded-lg w-fit">
            <button
              type="button"
              onClick={() => setMode("url")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                mode === "url"
                  ? "bg-accent text-white"
                  : "text-muted hover:text-foreground"
              }`}
            >
              From URL
            </button>
            <button
              type="button"
              onClick={() => setMode("prompt")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                mode === "prompt"
                  ? "bg-accent text-white"
                  : "text-muted hover:text-foreground"
              }`}
            >
              From Prompt
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-2">
            {mode === "url" ? (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted">Generate style from a website:</label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter a URL (e.g. openrouter.ai)"
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted">Generate style from a prompt:</label>
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe a mood (e.g. warm sunset, retro 80s neon)"
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted">with</span>
              <select
                value={moodModel}
                onChange={(e) => onMoodModelChange(e.target.value)}
                className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent transition-colors cursor-pointer"
              >
                {MOOD_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={isDisabled}
                className="px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
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
                  className="shrink-0 px-3 py-1 text-xs font-medium bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 rounded-md transition-colors"
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
          <span className="text-xs text-muted">
            Generated by <span className="text-foreground">{generatedModelLabel}</span>
          </span>
          <button
            onClick={() => onBrandData(null)}
            className="text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer"
          >
            Delete Mood
          </button>
        </div>
      )}

      {brandData && (
        <div className="p-4 bg-surface border border-border rounded-lg space-y-4">
          {/* Color palette */}
          <div>
            <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-2">
              Color Palette
            </h3>
            <div className="flex gap-2 flex-wrap">
              {brandData.colors.map((color, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div
                    className="w-6 h-6 rounded-md border border-border"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs text-muted font-mono">{color}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Personality */}
          <div>
            <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-2">
              Personality
            </h3>
            <div className="flex gap-1.5 flex-wrap">
              {brandData.personality.map((trait, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 text-xs bg-accent/10 text-accent rounded-full"
                >
                  {trait}
                </span>
              ))}
            </div>
          </div>

          {/* Visual style */}
          <div>
            <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-2">
              Visual Style
            </h3>
            <div className="flex gap-1.5 flex-wrap">
              {brandData.visualStyle.map((style, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 text-xs bg-surface-hover text-foreground border border-border rounded-full"
                >
                  {style}
                </span>
              ))}
            </div>
          </div>

          {/* Tone */}
          <div>
            <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-2">
              Tone
            </h3>
            <p className="text-sm text-foreground/80">{brandData.tone}</p>
          </div>

          {/* System prompt */}
          <div className="p-3 border border-border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-muted uppercase tracking-wider">
                Generated System Prompt
              </h3>
              {editingPrompt ? (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      onBrandData({ ...brandData, customSystemPrompt: promptDraft });
                      setEditingPrompt(false);
                    }}
                    className="text-xs text-accent hover:text-accent-hover transition-colors cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingPrompt(false)}
                    className="text-xs text-muted hover:text-foreground transition-colors cursor-pointer"
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
                  className="text-xs text-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  Edit
                </button>
              )}
            </div>
            {editingPrompt ? (
              <textarea
                value={promptDraft}
                onChange={(e) => setPromptDraft(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent transition-colors resize-y font-mono"
              />
            ) : (
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                {brandData.customSystemPrompt ?? buildSystemPrompt(brandData)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
