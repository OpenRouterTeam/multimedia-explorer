import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/openrouter";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing API key" }, { status: 401 });
  }
  const apiKey = authHeader.slice(7);

  const { prompt, model } = await request.json();
  if (!prompt) {
    return NextResponse.json(
      { error: "A prompt is required" },
      { status: 400 }
    );
  }

  try {
    const client = createClient(apiKey);

    const result = await client.chat.send({
      chatGenerationParams: {
        model: model || "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert at writing image generation prompts. Given a user's rough prompt, rewrite it to be more detailed, vivid, and effective for AI image generation. Keep the core intent but add specific details about composition, lighting, style, colors, and mood where appropriate. Return ONLY the improved prompt text, nothing else. Do not wrap it in quotes.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      },
    });

    const content = result.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      throw new Error("No content in LLM response");
    }

    return NextResponse.json({ prompt: content.trim() });
  } catch (err) {
    console.error("Improve prompt error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to improve prompt",
      },
      { status: 500 }
    );
  }
}
