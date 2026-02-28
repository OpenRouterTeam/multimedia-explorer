import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/openrouter";

const VALID_ASPECT_RATIOS = new Set(["1:1", "16:9", "9:16", "4:3", "3:2"]);
const EXTENDED_ASPECT_RATIOS = new Set(["1:4", "4:1", "1:8", "8:1"]);
const VALID_RESOLUTIONS = new Set(["1K", "2K", "4K"]);

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing API key" }, { status: 401 });
  }
  const apiKey = authHeader.slice(7);

  const { prompt, brandContext, model, aspectRatio, resolution, referenceImages } = await request.json();

  if (!prompt || !model) {
    return NextResponse.json(
      { error: "Prompt and model are required" },
      { status: 400 }
    );
  }

  const isGeminiFlash = model === "google/gemini-3.1-flash-image-preview";
  const validAspect =
    VALID_ASPECT_RATIOS.has(aspectRatio) || (isGeminiFlash && EXTENDED_ASPECT_RATIOS.has(aspectRatio))
      ? aspectRatio
      : "1:1";
  const validResolution = VALID_RESOLUTIONS.has(resolution) ? resolution : "1K";

  // Build messages with brand context as a system message when available
  type ContentPart =
    | { type: "text"; text: string }
    | { type: "image_url"; imageUrl: { url: string } };
  const messages: Array<
    | { role: "system"; content: string }
    | { role: "user"; content: string | ContentPart[] }
  > = [];

  if (brandContext) {
    const systemContent = brandContext.customSystemPrompt ?? [
      "The user wants the generated image to match a specific brand identity. Apply the following brand guidelines to the image:",
      "",
      `Visual style: ${brandContext.stylePrompt}`,
      `Color palette: ${brandContext.colors?.join(", ")}`,
      `Personality: ${brandContext.personality?.join(", ")}`,
      `Visual descriptors: ${brandContext.visualStyle?.join(", ")}`,
      "",
      "Incorporate these brand elements naturally into the image. The user's prompt below describes what to generate — the brand context above describes how it should look and feel.",
    ].join("\n");

    messages.push({
      role: "system" as const,
      content: systemContent,
    });
  }

  // Build user message — multipart when reference images are provided
  if (Array.isArray(referenceImages) && referenceImages.length > 0) {
    const contentParts: ContentPart[] = [
      { type: "text", text: prompt },
      ...referenceImages.map((url: string) => ({
        type: "image_url" as const,
        imageUrl: { url },
      })),
    ];
    messages.push({ role: "user" as const, content: contentParts });
  } else {
    messages.push({ role: "user" as const, content: prompt });
  }

  try {
    const client = createClient(apiKey);

    const result = await client.chat.send({
      chatGenerationParams: {
        model,
        messages,
        modalities: ["image"],
        imageConfig: {
          aspect_ratio: validAspect,
          image_size: validResolution,
        },
      },
    });

    const message = result.choices?.[0]?.message as Record<string, unknown>;
    if (!message) {
      throw new Error("No response from model");
    }

    // Extract image from response. The SDK may return images in several places:
    // 1. message.images[] — dedicated array with { imageUrl: { url } } objects
    // 2. message.content[] — content parts with type "image_url" and { imageUrl: { url } }
    // 3. message.content as a string — raw base64 data URL
    let imageUrl: string | null = null;

    // Check message.images first (SDK-parsed dedicated field)
    const images = message.images as Array<{ imageUrl?: { url?: string } }> | undefined;
    if (Array.isArray(images) && images.length > 0) {
      imageUrl = images[0]?.imageUrl?.url ?? null;
    }

    // Fall back to content array parts (SDK uses camelCase imageUrl)
    if (!imageUrl && Array.isArray(message.content)) {
      for (const part of message.content as Array<Record<string, unknown>>) {
        if (part.type === "image_url") {
          const img = part.imageUrl as { url?: string } | undefined;
          if (img?.url) {
            imageUrl = img.url;
            break;
          }
        }
      }
    }

    // Fall back to string content (raw base64 data URL)
    if (!imageUrl && typeof message.content === "string") {
      if ((message.content as string).startsWith("data:image")) {
        imageUrl = message.content as string;
      }
    }

    if (!imageUrl) {
      return NextResponse.json({
        error: "Could not extract image from response",
        raw: message,
      }, { status: 500 });
    }

    return NextResponse.json({ imageUrl, model: result.model });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to generate image",
      },
      { status: 500 }
    );
  }
}
