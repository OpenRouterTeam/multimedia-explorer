"use client";

import { useState } from "react";
import type { HistoryEntry } from "@/lib/types";

export default function HistoryTimeline({
  entries,
  activeId,
  onSelect,
  onReturnToCurrent,
}: {
  entries: HistoryEntry[];
  activeId: string | null;
  onSelect: (entry: HistoryEntry) => void;
  onReturnToCurrent: () => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col items-center pt-1">
      <span className="text-[9px] uppercase tracking-[0.2em] text-muted/50 mb-3">History</span>

      {/* Current / return-to-top dot */}
      <button
        type="button"
        onClick={onReturnToCurrent}
        className={`w-3.5 h-3.5 rounded-full border-2 border-accent hover:scale-125 transition-all cursor-pointer ${
          activeId === null
            ? "bg-accent ring-2 ring-accent/30 shadow-[0_0_8px_rgba(59,130,246,0.4)]"
            : "bg-accent/30"
        }`}
        title="Current"
      />

      {entries.length > 0 && (
        <>
          {/* Divider */}
          <div className="w-px h-3 bg-border/40 mt-2" />

          {/* History dots (newest first) */}
          <div className="flex flex-col items-center mt-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="relative flex items-center justify-center py-[6px] px-2 cursor-pointer"
                onMouseEnter={() => setHoveredId(entry.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onSelect(entry)}
              >
                <div
                  className={`w-3 h-3 rounded-full transition-all ${
                    activeId === entry.id
                      ? "bg-accent scale-125 ring-2 ring-accent/30 shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                      : hoveredId === entry.id
                        ? "bg-muted scale-125 shadow-[0_0_6px_rgba(100,116,139,0.3)]"
                        : "bg-border/60"
                  }`}
                />

                {/* Thumbnail popover */}
                {hoveredId === entry.id && entry.imageUrl && (
                  <div className="absolute top-1/2 right-full mr-3 -translate-y-1/2 z-50 w-[7rem] p-1.5 bg-surface border border-accent/30 rounded-xl shadow-lg backdrop-blur-sm glow-accent-sm">
                    <img
                      src={entry.imageUrl}
                      alt="History thumbnail"
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  </div>
                )}
                {hoveredId === entry.id && !entry.imageUrl && entry.mediaType === "video" && (
                  <div className="absolute top-1/2 right-full mr-3 -translate-y-1/2 z-50 w-[7rem] p-1.5 bg-surface border border-accent/30 rounded-xl shadow-lg backdrop-blur-sm flex items-center justify-center glow-accent-sm">
                    <div className="w-24 h-24 flex flex-col items-center justify-center text-muted/50">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                        <line x1="7" y1="2" x2="7" y2="22" />
                        <line x1="17" y1="2" x2="17" y2="22" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <line x1="2" y1="7" x2="7" y2="7" />
                        <line x1="2" y1="17" x2="7" y2="17" />
                        <line x1="17" y1="7" x2="22" y2="7" />
                        <line x1="17" y1="17" x2="22" y2="17" />
                      </svg>
                      <span className="text-[9px] mt-1 tracking-wide">Video</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
