import { OpenRouter } from "@openrouter/sdk";
import { type VideoModelConfig, REQUIRES_AUDIO_MODELS } from "@/lib/types";

type ModelEntry = { id: string; label: string };
type CacheData = {
  image: ModelEntry[];
  video: ModelEntry[];
  videoModelConfigs: Record<string, VideoModelConfig>;
};

let cache: { data: CacheData; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const client = new OpenRouter({
  httpReferer: "http://localhost:3000",
  xTitle: "Multimedia Explorer",
});

function stripProviderPrefix(name: string): string {
  const colonIdx = name.indexOf(": ");
  return colonIdx !== -1 ? name.slice(colonIdx + 2) : name;
}

async function fetchVideoModelConfigs(): Promise<Record<string, VideoModelConfig>> {
  const res = await fetch("https://openrouter.ai/api/v1/videos/models");
  if (!res.ok) return {};
  const json = await res.json();
  const models = Array.isArray(json) ? json : json.data ?? [];
  const configs: Record<string, VideoModelConfig> = {};
  for (const m of models) {
    configs[m.id] = {
      durations: m.supported_durations ?? [],
      resolutions: m.supported_resolutions ?? [],
      aspectRatios: m.supported_aspect_ratios ?? [],
      supportsAudio: m.generate_audio === true,
      ...(REQUIRES_AUDIO_MODELS.has(m.id) && { requiresAudio: true }),
    };
  }
  return configs;
}

async function fetchByModality(modality: string): Promise<ModelEntry[]> {
  // The SDK doesn't support output_modalities as a query param yet,
  // so we pass it via serverURL to append it to the request.
  const response = await client.models.list(undefined, {
    serverURL: `https://openrouter.ai/api/v1?output_modalities=${modality}`,
  });

  return response.data.map((m) => ({
    id: m.id,
    label: stripProviderPrefix(m.name),
  }));
}

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return Response.json(cache.data);
  }

  try {
    const [image, video, videoModelConfigs] = await Promise.all([
      fetchByModality("image"),
      fetchByModality("video"),
      fetchVideoModelConfigs(),
    ]);

    const result: CacheData = { image, video, videoModelConfigs };
    cache = { data: result, ts: Date.now() };

    return Response.json(result);
  } catch {
    return Response.json({ error: "Failed to fetch models from OpenRouter" }, { status: 502 });
  }
}
