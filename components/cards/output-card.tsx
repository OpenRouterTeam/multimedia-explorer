"use client";

import {
  ASPECT_RATIOS,
  EXTENDED_ASPECT_RATIOS,
  RESOLUTIONS,
  VIDEO_ASPECT_RATIOS,
  VIDEO_RESOLUTIONS,
  VIDEO_DURATIONS,
  NO_480P_MODELS,
  MODEL_DURATIONS,
} from "@/lib/types";

const GEMINI_FLASH_MODEL = "google/gemini-3.1-flash-image-preview";
const VEO_MODEL = "google/veo-3.1";

export function OutputCardHeader({
  aspectRatio,
  resolution,
  isVideoModel,
  duration,
}: {
  aspectRatio: string;
  resolution: string;
  isVideoModel?: boolean;
  duration?: number;
}) {
  return (
    <div>
      <div className="text-sm font-medium">Output</div>
      <div className="text-xs text-muted mt-1">
        {aspectRatio} / {resolution}
        {isVideoModel && duration ? ` / ${duration}s` : ""}
      </div>
    </div>
  );
}

export function OutputCardBody({
  aspectRatio,
  onAspectRatioChange,
  resolution,
  onResolutionChange,
  model,
  isVideoModel,
  duration,
  onDurationChange,
  generateAudio,
  onGenerateAudioChange,
}: {
  aspectRatio: string;
  onAspectRatioChange: (ratio: string) => void;
  resolution: string;
  onResolutionChange: (res: string) => void;
  model: string;
  isVideoModel?: boolean;
  duration?: number;
  onDurationChange?: (d: number) => void;
  generateAudio?: boolean;
  onGenerateAudioChange?: (v: boolean) => void;
}) {
  const showExtended = !isVideoModel && model === GEMINI_FLASH_MODEL;
  const ratios = isVideoModel
    ? VIDEO_ASPECT_RATIOS
    : showExtended
      ? [...ASPECT_RATIOS, ...EXTENDED_ASPECT_RATIOS]
      : ASPECT_RATIOS;
  const resolutions = isVideoModel
    ? NO_480P_MODELS.includes(model)
      ? VIDEO_RESOLUTIONS.filter((r) => r !== "480p")
      : VIDEO_RESOLUTIONS
    : RESOLUTIONS;
  const showAudioToggle = isVideoModel && model === VEO_MODEL;

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
            Aspect Ratio
          </label>
          <div className="flex gap-1.5 flex-wrap">
            {ratios.map((ratio) => (
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
            {resolutions.map((res) => (
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

      {isVideoModel && (
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
              Duration
            </label>
            <div className="flex gap-1.5">
              {(MODEL_DURATIONS[model] ?? VIDEO_DURATIONS).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onDurationChange?.(d)}
                  className={`px-2.5 py-1 text-xs rounded-md border transition-colors cursor-pointer ${
                    duration === d
                      ? "bg-accent text-white border-accent"
                      : "bg-surface border-border text-muted hover:text-foreground hover:border-accent/50"
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          {showAudioToggle && (
            <label className="flex items-center gap-2 cursor-pointer pb-0.5">
              <input
                type="checkbox"
                checked={generateAudio ?? false}
                onChange={(e) => onGenerateAudioChange?.(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-border bg-surface accent-accent cursor-pointer"
              />
              <span className="text-xs text-muted">Generate Audio</span>
            </label>
          )}
        </div>
      )}
    </div>
  );
}
