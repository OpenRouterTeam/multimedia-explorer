"use client";

import { useState } from "react";
import AuthPrompt from "./auth-prompt";

export interface BrandData {
  colors: string[];
  personality: string[];
  visualStyle: string[];
  tone: string;
  stylePrompt: string;
  customSystemPrompt?: string;
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

export default function Moodboard({
  apiKey,
  brandData,
  onBrandData,
  onAuthNeeded,
}: {
  apiKey: string | null;
  brandData: BrandData | null;
  onBrandData: (data: BrandData | null) => void;
  onAuthNeeded: (key: string) => void;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptDraft, setPromptDraft] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    if (!apiKey) {
      setShowAuthPrompt(true);
      return;
    }

    setShowAuthPrompt(false);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/moodboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to analyze brand");
      }

      const data: BrandData = await res.json();
      onBrandData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter a URL (e.g. https://openrouter.ai)"
          className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              Analyzing
            </span>
          ) : (
            "Analyze"
          )}
        </button>
      </form>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {showAuthPrompt && <AuthPrompt onAuthNeeded={onAuthNeeded} onDismiss={() => setShowAuthPrompt(false)} />}

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
