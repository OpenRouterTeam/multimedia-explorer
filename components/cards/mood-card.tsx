"use client";

import type { BrandData } from "../moodboard";

export function MoodCardHeader({ brandData }: { brandData: BrandData | null }) {
  return (
    <div>
      <div className="text-sm font-medium tracking-wide">Set a Mood/Brand</div>
      {brandData ? (
        <div className="flex gap-1.5 mt-1.5">
          {brandData.colors.slice(0, 5).map((color, i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-full border border-border/60"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      ) : (
        <div className="text-xs text-muted/50 mt-1 tracking-wide">None</div>
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
