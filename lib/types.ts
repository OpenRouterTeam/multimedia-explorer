export const MOOD_MODELS = [
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "openai/gpt-5.2-pro", label: "GPT-5.2 Pro" },
  { id: "anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6" },
  { id: "anthropic/claude-opus-4.6", label: "Claude Opus 4.6" },
  { id: "deepseek/deepseek-v3.2", label: "DeepSeek V3.2" },
  { id: "google/gemini-3-pro-preview", label: "Gemini 3 Pro Preview" },
  { id: "mistralai/mistral-large-2512", label: "Mistral Large" },
  { id: "qwen/qwen3.5-plus-02-15", label: "Qwen 3.5 Plus" },
  { id: "x-ai/grok-4.1-fast", label: "Grok 4.1 Fast" },
  { id: "openai/gpt-5.2-chat", label: "GPT-5.2 Chat" },
];

export interface ReferenceImage {
  id: string;
  url: string;
  name: string;
}

export type CardId = "mood" | "model" | "inputImages" | "output";

export const ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:2"];
export const EXTENDED_ASPECT_RATIOS = ["1:4", "4:1", "1:8", "8:1"];
export const RESOLUTIONS = ["1K", "2K", "4K"];

/** Default fallbacks for unknown video models */
export const VIDEO_ASPECT_RATIOS = ["16:9", "9:16", "1:1"];
export const VIDEO_RESOLUTIONS = ["720p", "1080p"];
export const VIDEO_DURATIONS = [5, 10, 15];

export interface VideoModelConfig {
  durations: number[];
  resolutions: string[];
  aspectRatios: string[];
  supportsAudio: boolean;
  /** When true, audio generation is mandatory and cannot be toggled off */
  requiresAudio?: boolean;
}

/** Models where audio generation is mandatory */
export const REQUIRES_AUDIO_MODELS = new Set(["openai/sora-2-pro"]);

export const DEFAULT_VIDEO_CONFIG: VideoModelConfig = {
  durations: VIDEO_DURATIONS,
  resolutions: VIDEO_RESOLUTIONS,
  aspectRatios: VIDEO_ASPECT_RATIOS,
  supportsAudio: false,
};

export type MediaResult =
  | { type: "image"; imageUrl: string; model: string }
  | { type: "video"; videoUrl: string; model: string };

export interface HistoryEntry {
  id: string;
  timestamp: number;
  /** Loaded from IndexedDB at runtime, not persisted in localStorage */
  imageUrl?: string;
  model: string;
  prompt: string;
  brandData: import("@/components/moodboard").BrandData | null;
  referenceImages: ReferenceImage[];
  aspectRatio: string;
  resolution: string;
  mediaType?: "image" | "video";
  duration?: number;
  generateAudio?: boolean;
  videoJobId?: string;
}
