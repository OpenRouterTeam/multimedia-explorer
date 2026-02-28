"use client";

import { useState, useEffect } from "react";

export default function ImageResult({
  result,
  loading,
  onAddAsInputImage,
}: {
  result: { imageUrl: string; model: string } | null;
  loading: boolean;
  onAddAsInputImage?: (url: string) => void;
}) {
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setAdded(false);
  }, [loading, result]);
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted">Generating your image...</p>
      </div>
    );
  }

  if (!result) return null;

  function handleDownload() {
    if (!result) return;

    const link = document.createElement("a");
    link.href = result.imageUrl;
    link.download = `media-playground-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-heading font-semibold">Result</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">{result.model}</span>
          {onAddAsInputImage && (
            <button
              onClick={() => {
                onAddAsInputImage(result.imageUrl);
                setAdded(true);
              }}
              className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:border-accent hover:text-accent transition-colors cursor-pointer"
            >
              {added ? "Added as Input" : "Add as Input Image"}
            </button>
          )}
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:border-accent hover:text-accent transition-colors cursor-pointer"
          >
            Download
          </button>
        </div>
      </div>

      <div className="rounded-lg overflow-hidden border border-border bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={result.imageUrl}
          alt="Generated image"
          className="w-full h-auto"
        />
      </div>
    </div>
  );
}
