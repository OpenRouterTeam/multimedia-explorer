"use client";

import { useState, useRef, useCallback } from "react";
import type { ReferenceImage } from "@/lib/types";

export function ReferencesCardHeader({ images }: { images: ReferenceImage[] }) {
  return (
    <div>
      <div className="text-sm font-medium tracking-wide">Input Images</div>
      <div className="text-xs text-muted mt-1 tracking-wide">
        {images.length > 0 ? `${images.length} image${images.length === 1 ? "" : "s"}` : "None"}
      </div>
    </div>
  );
}

function randomId(): string {
  return (
    crypto.randomUUID?.() ??
    Math.random().toString(36).slice(2) + Date.now().toString(36)
  );
}

export function ReferencesCardBody({
  images,
  onImagesChange,
}: {
  images: ReferenceImage[];
  onImagesChange: (images: ReferenceImage[]) => void;
}) {
  const [urlInput, setUrlInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  function addImage(img: ReferenceImage) {
    onImagesChange([...images, img]);
  }

  function removeImage(id: string) {
    onImagesChange(images.filter((img) => img.id !== id));
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        addImage({
          id: randomId(),
          url: reader.result as string,
          name: file.name,
        });
      };
      reader.readAsDataURL(file);
    });
  }

  function handleAddUrl() {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    addImage({
      id: crypto.randomUUID(),
      url: trimmed,
      name: new URL(trimmed).pathname.split("/").pop() || "image",
    });
    setUrlInput("");
  }

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [images]
  );

  return (
    <div className="space-y-4">
      {/* Thumbnail grid */}
      {images.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {images.map((img) => (
            <div key={img.id} className="relative group">
              <img
                src={img.url}
                alt={img.name}
                className="w-32 h-32 object-cover rounded-lg border border-border hover:border-accent/30 hover:shadow-[0_0_8px_rgba(59,130,246,0.1)] transition-all"
              />
              <button
                onClick={() => removeImage(img.id)}
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500/80 hover:bg-red-500 text-white rounded-full text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-[0_0_6px_rgba(239,68,68,0.3)]"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload drop zone */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
          isDragging
            ? "border-accent bg-accent/5 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
            : "border-border hover:border-accent/30 bg-surface/50 hover:shadow-[0_0_8px_rgba(59,130,246,0.05)]"
        }`}
      >
        <svg
          className={`w-6 h-6 ${isDragging ? "text-accent" : "text-muted"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>
        <span className="text-xs font-medium text-foreground/90 tracking-wide">
          {isDragging ? "Drop images here" : "Click to upload or drag & drop"}
        </span>
        <span className="text-[10px] text-muted/60 tracking-wide">PNG, JPG, WebP, GIF</span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-border/60" />
        <span className="text-[10px] uppercase tracking-[0.15em] text-muted/60 font-medium">or</span>
        <div className="flex-1 h-px bg-border/60" />
      </div>

      {/* URL input */}
      <div className="flex gap-2">
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddUrl())}
          placeholder="Paste image URL..."
          className="flex-1 px-4 py-2 bg-surface border border-border rounded-lg text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:border-accent/60 focus:shadow-[0_0_10px_rgba(59,130,246,0.15)] transition-all"
        />
        <button
          type="button"
          onClick={handleAddUrl}
          disabled={!urlInput.trim()}
          className="px-4 py-2 text-xs font-medium tracking-wide bg-accent hover:bg-accent-hover text-white rounded-lg transition-all hover:shadow-[0_0_10px_rgba(59,130,246,0.3)] disabled:opacity-50 cursor-pointer"
        >
          Add
        </button>
      </div>
    </div>
  );
}
