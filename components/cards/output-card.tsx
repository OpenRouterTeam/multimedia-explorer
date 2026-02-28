"use client";

import { ASPECT_RATIOS, RESOLUTIONS } from "@/lib/types";

export function OutputCardHeader({
  aspectRatio,
  resolution,
}: {
  aspectRatio: string;
  resolution: string;
}) {
  return (
    <div>
      <div className="text-sm font-medium">Output</div>
      <div className="text-xs text-muted mt-1">{aspectRatio} / {resolution}</div>
    </div>
  );
}

export function OutputCardBody({
  aspectRatio,
  onAspectRatioChange,
  resolution,
  onResolutionChange,
}: {
  aspectRatio: string;
  onAspectRatioChange: (ratio: string) => void;
  resolution: string;
  onResolutionChange: (res: string) => void;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-1">
        <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
          Aspect Ratio
        </label>
        <div className="flex gap-1.5 flex-wrap">
          {ASPECT_RATIOS.map((ratio) => (
            <button
              key={ratio}
              type="button"
              onClick={() => onAspectRatioChange(ratio)}
              className={`px-2.5 py-1 text-xs rounded-md border transition-colors cursor-pointer ${
                aspectRatio === ratio
                  ? "bg-accent text-white border-accent"
                  : "bg-surface border-border text-muted hover:text-foreground hover:border-accent/50"
              }`}
            >
              {ratio}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
          Resolution
        </label>
        <div className="flex gap-1.5">
          {RESOLUTIONS.map((res) => (
            <button
              key={res}
              type="button"
              onClick={() => onResolutionChange(res)}
              className={`px-2.5 py-1 text-xs rounded-md border transition-colors cursor-pointer ${
                resolution === res
                  ? "bg-accent text-white border-accent"
                  : "bg-surface border-border text-muted hover:text-foreground hover:border-accent/50"
              }`}
            >
              {res}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
