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

  return <span className="tabular-nums text-accent">{elapsed}s</span>;
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
      submitting: "Submitting video job...",
      pending: "Queued for processing",
      in_progress: "Generation in progress",
    };

    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-5">
        <div className="retro-spinner animate-pulse-glow" />
        {isVideoGenerating ? (
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-sm text-muted tracking-wide">
              Video is being generated... <ElapsedTime />
            </p>
            <p className="text-xs text-muted/50 tracking-wide">
              {statusSubtext[videoStatus!] ?? ""}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted tracking-wide">Generating your image...</p>
        )}
      </div>
    );
  }

  if (loadingVideo) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-5">
        <div className="retro-spinner" />
        <p className="text-sm text-muted tracking-wide">Loading video from history...</p>
      </div>
    );
  }

  if (videoStatus === "failed" && videoError) {
    const isCredit = /insufficient.*credits|out of credits|not enough credits|credits.*required|payment required/i.test(videoError);
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        {isCredit ? (
          <>
            <p className="text-sm text-yellow-400">{videoError}</p>
            <a
              href="https://openrouter.ai/settings/credits"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 text-sm tracking-wide bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 border border-yellow-500/20 rounded-lg transition-all"
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-heading font-bold tracking-tight text-glow-sm">// RESULT</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted/60 tracking-wide">{result.model}</span>
          {!isVideo && onAddAsInputImage && (
            <button
              onClick={() => {
                if (result.type === "image") {
                  onAddAsInputImage(result.imageUrl);
                  setAdded(true);
                }
              }}
              className="px-4 py-2 text-xs tracking-wide border border-border rounded-lg hover:border-accent/40 hover:text-accent hover:shadow-[0_0_8px_rgba(59,130,246,0.1)] transition-all cursor-pointer"
            >
              {added ? "Added" : "Add as Input"}
            </button>
          )}
          {!isExpiredVideo && (
            <button
              onClick={handleDownload}
              className="px-4 py-2 text-xs tracking-wide border border-border rounded-lg hover:border-accent/40 hover:text-accent hover:shadow-[0_0_8px_rgba(59,130,246,0.1)] transition-all cursor-pointer"
            >
              Download
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl overflow-hidden border border-border bg-surface/50 hover:border-accent/20 transition-all">
        {isExpiredVideo ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3 text-muted">
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
            <p className="text-sm tracking-wide">This video has expired and is no longer available.</p>
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
