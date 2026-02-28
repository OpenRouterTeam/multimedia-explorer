"use client";

import type { BrandData } from "../moodboard";

export function MoodCardHeader({ brandData }: { brandData: BrandData | null }) {
  return (
    <div>
      <div className="text-sm font-medium truncate">Set a Mood/Brand</div>
      {brandData ? (
        <div className="flex gap-1 mt-1">
          {brandData.colors.slice(0, 5).map((color, i) => (
            <div
              key={i}
              className="w-3.5 h-3.5 rounded-full border border-border"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      ) : (
        <div className="text-xs text-muted mt-1">None</div>
      )}
    </div>
  );
}

export function MoodCardBody({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      {children}
    </div>
  );
}
