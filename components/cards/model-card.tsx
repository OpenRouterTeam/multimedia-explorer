"use client";

import { MODELS, VIDEO_MODELS } from "@/lib/types";

export function ModelCardHeader({ model }: { model: string }) {
  const selected = MODELS.find((m) => m.id === model);
  return (
    <div>
      <div className="text-sm font-medium">Select Image or Video Model</div>
      <div className="text-xs text-muted truncate mt-1">{selected?.label ?? model}</div>
    </div>
  );
}

export function ModelCardBody({
  model,
  onModelChange,
}: {
  model: string;
  onModelChange: (model: string) => void;
}) {
  return (
    <div>
      <div>
        <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
          Select Image or Video Model
        </label>
        <select
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent transition-colors cursor-pointer"
        >
          <optgroup label="Image Models">
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Video Models (Coming Soon)">
            {VIDEO_MODELS.map((m) => (
              <option key={m.id} value={m.id} disabled>
                {m.label}
              </option>
            ))}
          </optgroup>
        </select>
      </div>
    </div>
  );
}
