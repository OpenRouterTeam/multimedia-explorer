"use client";

import { useState, useEffect, useRef } from "react";
import type { MediaResult } from "@/lib/types";
import type { VideoStatus } from "@/hooks/use-video-generation";

function ElapsedTime() {
  const startRef = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    startRef.current = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return <span className="tabular-nums">{elapsed}s</span>;
}

export default function ImageResult({
  result,
  loading,
  loadingVideo,
  onAddAsInputImage,
  videoStatus,
  videoError,
}: {
  result: MediaResult | null;
  loading: boolean;
  loadingVideo?: boolean;
  onAddAsInputImage?: (url: string) => void;
  videoStatus?: VideoStatus;
  videoError?: string | null;
}) {
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setAdded(false);
  }, [loading, result]);

  const isVideoGenerating =
    videoStatus === "submitting" ||
    videoStatus === "pending" ||
    videoStatus === "in_progress";

  if (loading || isVideoGenerating) {
    const statusSubtext: Record<string, string> = {
      submitting: "Submitting video job…",
      pending: "Queued for processing",
      in_progress: "Generation in progress",
    };

    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        {isVideoGenerating ? (
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm text-muted">
              Video is being generated… <ElapsedTime />
            </p>
            <p className="text-xs text-muted/60">
              {statusSubtext[videoStatus!] ?? ""}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted">Generating your image…</p>
        )}
      </div>
    );
  }

  if (loadingVideo) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted">Loading video from history…</p>
      </div>
    );
  }

  if (videoStatus === "failed" && videoError) {
    const isCredit = /insufficient.*credits|out of credits|not enough credits|credits.*required|payment required/i.test(videoError);
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        {isCredit ? (
          <>
            <p className="text-sm text-yellow-400">{videoError}</p>
            <a
              href="https://openrouter.ai/settings/credits"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm font-medium bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 rounded-lg transition-colors"
            >
              Add credits
            </a>
          </>
        ) : (
          <p className="text-sm text-red-400">{videoError}</p>
        )}
      </div>
    );
  }

  if (!result) return null;

  const isVideo = result.type === "video";
  const isExpiredVideo = isVideo && !result.videoUrl;

  function handleDownload() {
    if (!result) return;

    const link = document.createElement("a");
    if (result.type === "image") {
      link.href = result.imageUrl;
      link.download = `media-playground-${Date.now()}.png`;
    } else {
      link.href = result.videoUrl;
      link.download = `media-playground-${Date.now()}.mp4`;
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const mediaUrl = result.type === "image" ? result.imageUrl : result.videoUrl;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-heading font-semibold">Result</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">{result.model}</span>
          {!isVideo && onAddAsInputImage && (
            <button
              onClick={() => {
                if (result.type === "image") {
                  onAddAsInputImage(result.imageUrl);
                  setAdded(true);
                }
              }}
              className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:border-accent hover:text-accent transition-colors cursor-pointer"
            >
              {added ? "Added as Input" : "Add as Input Image"}
            </button>
          )}
          {!isExpiredVideo && (
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:border-accent hover:text-accent transition-colors cursor-pointer"
            >
              Download
            </button>
          )}
        </div>
      </div>

      <div className="rounded-lg overflow-hidden border border-border bg-surface">
        {isExpiredVideo ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3 text-muted">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
              <line x1="7" y1="2" x2="7" y2="22" />
              <line x1="17" y1="2" x2="17" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="2" y1="7" x2="7" y2="7" />
              <line x1="2" y1="17" x2="7" y2="17" />
              <line x1="17" y1="7" x2="22" y2="7" />
              <line x1="17" y1="17" x2="22" y2="17" />
            </svg>
            <p className="text-sm">This video has expired and is no longer available for playback.</p>
          </div>
        ) : isVideo ? (
          <video
            src={mediaUrl}
            controls
            autoPlay
            loop
            className="w-full h-auto"
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={mediaUrl}
            alt="Generated image"
            className="w-full h-auto"
          />
        )}
      </div>
    </div>
  );
}
