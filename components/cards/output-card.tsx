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
      <div className="text-sm font-medium tracking-wide">Output Settings</div>
      <div className="text-xs text-muted/60 mt-1 tracking-wide">
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
      <div className="flex gap-6">
        <div className="flex-1">
          <label className="block text-[10px] font-medium text-muted uppercase tracking-[0.15em] mb-2">
            Aspect Ratio
          </label>
          <div className="flex gap-2 flex-wrap">
            {ratios.map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => onAspectRatioChange(ratio)}
                className={`px-3 py-1.5 text-xs tracking-wide rounded-lg border transition-all cursor-pointer ${
                  aspectRatio === ratio
                    ? "bg-accent text-white border-accent shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                    : "bg-surface border-border text-muted hover:text-foreground hover:border-accent/30 hover:shadow-[0_0_6px_rgba(59,130,246,0.08)]"
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-medium text-muted uppercase tracking-[0.15em] mb-2">
            Resolution
          </label>
          <div className="flex gap-2">
            {resolutions.map((res) => (
              <button
                key={res}
                type="button"
                onClick={() => onResolutionChange(res)}
                className={`px-3 py-1.5 text-xs tracking-wide rounded-lg border transition-all cursor-pointer ${
                  resolution === res
                    ? "bg-accent text-white border-accent shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                    : "bg-surface border-border text-muted hover:text-foreground hover:border-accent/30 hover:shadow-[0_0_6px_rgba(59,130,246,0.08)]"
                }`}
              >
                {res}
              </button>
            ))}
          </div>
        </div>
      </div>

      {videoConfig && (
        <div className="flex gap-6 items-end">
          <div>
            <label className="block text-[10px] font-medium text-muted uppercase tracking-[0.15em] mb-2">
              Duration
            </label>
            <div className="flex gap-2">
              {videoConfig.durations.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onDurationChange?.(d)}
                  className={`px-3 py-1.5 text-xs tracking-wide rounded-lg border transition-all cursor-pointer ${
                    duration === d
                      ? "bg-accent text-white border-accent shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                      : "bg-surface border-border text-muted hover:text-foreground hover:border-accent/30 hover:shadow-[0_0_6px_rgba(59,130,246,0.08)]"
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          {videoConfig.supportsAudio && (
            <label
              className={`flex items-center gap-2.5 pb-0.5 ${videoConfig.requiresAudio ? "cursor-default" : "cursor-pointer"}`}
              title={videoConfig.requiresAudio ? "Sora always generates audio — it cannot be disabled" : undefined}
            >
              <input
                type="checkbox"
                checked={videoConfig.requiresAudio || (generateAudio ?? false)}
                onChange={(e) => !videoConfig.requiresAudio && onGenerateAudioChange?.(e.target.checked)}
                disabled={videoConfig.requiresAudio}
                className={`w-4 h-4 rounded border-border bg-surface accent-accent ${videoConfig.requiresAudio ? "cursor-default opacity-50" : "cursor-pointer"}`}
              />
              <span className={`text-xs tracking-wide ${videoConfig.requiresAudio ? "text-muted/50" : "text-muted"}`}>Generate Audio</span>
            </label>
          )}
        </div>
      )}
    </div>
  );
}
