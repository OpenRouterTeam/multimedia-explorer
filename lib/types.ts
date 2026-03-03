export const MODELS = [
  { id: "google/gemini-3.1-flash-image-preview", label: "Nano Banana 2 (Gemini 3.1 Flash)" },
  { id: "google/gemini-3-pro-image-preview", label: "Nano Banana Pro (Gemini 3 Pro)" },
  { id: "google/gemini-2.5-flash-image", label: "Nano Banana (Gemini 2.5 Flash)" },
  { id: "openai/gpt-5-image", label: "GPT-5 Image" },
  { id: "openai/gpt-5-image-mini", label: "GPT-5 Image Mini" },
  { id: "black-forest-labs/flux.2-max", label: "FLUX.2 Max" },
  { id: "black-forest-labs/flux.2-pro", label: "FLUX.2 Pro" },
  { id: "black-forest-labs/flux.2-flex", label: "FLUX.2 Flex" },
  { id: "black-forest-labs/flux.2-klein-4b", label: "FLUX.2 Klein 4B" },
  { id: "bytedance-seed/seedream-4.5", label: "Seedream 4.5" },
  { id: "sourceful/riverflow-v2-pro", label: "Riverflow V2 Pro" },
  { id: "sourceful/riverflow-v2-fast", label: "Riverflow V2 Fast" },
  { id: "sourceful/riverflow-v2-max-preview", label: "Riverflow V2 Max Preview" },
  { id: "sourceful/riverflow-v2-standard-preview", label: "Riverflow V2 Standard Preview" },
  { id: "sourceful/riverflow-v2-fast-preview", label: "Riverflow V2 Fast Preview" },
];

export const VIDEO_MODELS = [
  { id: "google/veo-3.1", label: "Veo 3.1" },
  { id: "openai/sora-2", label: "Sora 2" },
  { id: "bytedance/seedance-1.5-pro", label: "Seedance 1.5 Pro" },
];

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
}
