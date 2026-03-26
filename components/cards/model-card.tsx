"use client";

import type { ModelOption } from "@/hooks/use-models";

export function ModelCardHeader({
  model,
  imageModels,
  videoModels,
}: {
  model: string;
  imageModels: ModelOption[];
  videoModels?: ModelOption[];
}) {
  const selected = [...imageModels, ...(videoModels ?? [])].find((m) => m.id === model);
  return (
    <div>
      <div className="text-sm font-medium tracking-wide">Select Image or Video Model</div>
      <div className="text-xs text-muted/60 truncate mt-1">{selected?.label ?? model}</div>
    </div>
  );
}

type MediaFilter = "image" | "video";

export function ModelCardBody({
  model,
  onModelChange,
  imageModels,
  videoModels,
  loading,
}: {
  model: string;
  onModelChange: (model: string) => void;
  imageModels: ModelOption[];
  videoModels: ModelOption[];
  loading: boolean;
}) {
  const isVideoSelected = videoModels.some((m) => m.id === model);
  const activeFilter: MediaFilter = isVideoSelected ? "video" : "image";

  function handleFilterChange(filter: MediaFilter) {
    if (filter === activeFilter) return;
    const models = filter === "video" ? videoModels : imageModels;
    if (models.length > 0) {
      onModelChange(models[0].id);
    }
  }

  const visibleModels = activeFilter === "video" ? videoModels : imageModels;

  return (
    <div>
      <h2 className="text-base font-heading font-bold tracking-tight text-glow-sm mb-3">
        // CHOOSE A MODEL
      </h2>
      <div className="flex items-center gap-3">
        <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
          <button
            type="button"
            onClick={() => handleFilterChange("image")}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium tracking-wide transition-all cursor-pointer ${
              activeFilter === "image"
                ? "bg-accent text-white shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                : "bg-surface text-muted hover:text-foreground"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            Image
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange("video")}
            disabled={videoModels.length === 0}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium tracking-wide transition-all cursor-pointer border-l border-border disabled:opacity-30 disabled:cursor-not-allowed ${
              activeFilter === "video"
                ? "bg-accent text-white shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                : "bg-surface text-muted hover:text-foreground"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
            Video
          </button>
        </div>
        <select
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          disabled={loading}
          className="flex-1 min-w-0 px-3 py-2.5 bg-surface border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent/60 focus:shadow-[0_0_10px_rgba(59,130,246,0.15)] transition-all cursor-pointer disabled:opacity-40"
        >
          {loading && <option>Loading models...</option>}
          {visibleModels.length === 0 ? (
            <option disabled>No models available</option>
          ) : (
            visibleModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))
          )}
        </select>
      </div>
    </div>
  );
}
