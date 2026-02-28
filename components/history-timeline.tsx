"use client";

import { useState } from "react";
import type { HistoryEntry } from "@/lib/types";

export default function HistoryTimeline({
  entries,
  onSelect,
  onReturnToCurrent,
}: {
  entries: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onReturnToCurrent: () => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col items-center pt-1">
      <span className="text-[9px] uppercase tracking-wider text-muted mb-2">History</span>

      {/* Current / return-to-top dot */}
      <button
        type="button"
        onClick={onReturnToCurrent}
        className="w-3 h-3 rounded-full bg-accent border-2 border-accent hover:scale-125 transition-transform cursor-pointer"
        title="Current"
      />

      {entries.length > 0 && (
        <>
          {/* Divider */}
          <div className="w-px h-2 bg-border mt-2" />

          {/* History dots (newest first) */}
          <div className="flex flex-col items-center mt-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="relative flex items-center justify-center py-[5px] px-2 cursor-pointer"
                onMouseEnter={() => setHoveredId(entry.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onSelect(entry)}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    hoveredId === entry.id ? "bg-muted scale-125" : "bg-border"
                  }`}
                />

                {/* Thumbnail popover */}
                {hoveredId === entry.id && entry.imageUrl && (
                  <div className="absolute top-1/2 right-full mr-2 -translate-y-1/2 z-50 w-[6.5rem] p-1 bg-surface border border-border rounded-lg shadow-lg">
                    <img
                      src={entry.imageUrl}
                      alt="History thumbnail"
                      className="w-24 h-24 object-cover rounded"
                    />
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
