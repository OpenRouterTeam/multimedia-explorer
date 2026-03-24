"use client";

import {
  ASPECT_RATIOS,
  EXTENDED_ASPECT_RATIOS,
  RESOLUTIONS,
  getVideoConfig,
} from "@/lib/types";

const GEMINI_FLASH_MODEL = "google/gemini-3.1-flash-image-preview";

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
      <div className="text-sm font-medium">Output Settings</div>
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
  const videoConfig = isVideoModel ? getVideoConfig(model) : null;

  const showExtended = !isVideoModel && model === GEMINI_FLASH_MODEL;
  const ratios = videoConfig
    ? videoConfig.aspectRatios
    : showExtended
      ? [...ASPECT_RATIOS, ...EXTENDED_ASPECT_RATIOS]
      : ASPECT_RATIOS;
  const resolutions = videoConfig ? videoConfig.resolutions : RESOLUTIONS;

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

      {videoConfig && (
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
              Duration
            </label>
            <div className="flex gap-1.5">
              {videoConfig.durations.map((d) => (
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

          {videoConfig.supportsAudio && (
            <label
              className={`flex items-center gap-2 pb-0.5 ${videoConfig.requiresAudio ? "cursor-default" : "cursor-pointer"}`}
              title={videoConfig.requiresAudio ? "Sora always generates audio — it cannot be disabled" : undefined}
            >
              <input
                type="checkbox"
                checked={videoConfig.requiresAudio || (generateAudio ?? false)}
                onChange={(e) => !videoConfig.requiresAudio && onGenerateAudioChange?.(e.target.checked)}
                disabled={videoConfig.requiresAudio}
                className={`w-3.5 h-3.5 rounded border-border bg-surface accent-accent ${videoConfig.requiresAudio ? "cursor-default opacity-70" : "cursor-pointer"}`}
              />
              <span className={`text-xs ${videoConfig.requiresAudio ? "text-muted/70" : "text-muted"}`}>Generate Audio</span>
            </label>
          )}
        </div>
      )}
    </div>
  );
}
