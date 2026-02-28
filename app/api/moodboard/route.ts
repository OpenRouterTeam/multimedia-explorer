import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/openrouter";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing API key" }, { status: 401 });
  }
  const apiKey = authHeader.slice(7);

  const { url, prompt } = await request.json();
  if (!url && !prompt) {
    return NextResponse.json(
      { error: "Either a URL or prompt is required" },
      { status: 400 }
    );
  }

  try {
    const client = createClient(apiKey);

    let systemContent: string;
    let userContent: string;

    if (url) {
      // URL mode: fetch and analyze website HTML
      const pageResponse = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; MediaPlayground/1.0; +https://github.com/openrouter)",
        },
      });
      const html = await pageResponse.text();
      const truncatedHtml = html.slice(0, 15000);

      systemContent = `You are a brand identity analyst. Given a website's HTML, extract the brand's visual identity and return a JSON object with these fields:
- colors: array of hex color codes found or implied by the brand (max 6)
- personality: array of 3-5 adjective descriptors of the brand personality
- visualStyle: array of 3-5 visual style descriptors (e.g., "minimalist", "bold typography", "organic shapes")
- tone: a brief description of the brand's communication tone (1-2 sentences)
- stylePrompt: a concise image generation style prompt that captures this brand's visual identity (1-2 sentences, suitable for prepending to an image generation prompt)

Return ONLY valid JSON, no markdown fences.`;

      userContent = `Analyze this website HTML and extract the brand identity:\n\nURL: ${url}\n\n${truncatedHtml}`;
    } else {
      // Prompt mode: generate mood/brand identity from a text description
      systemContent = `You are a creative visual identity designer. Given a mood or style description, generate a cohesive visual identity and return a JSON object with these fields:
- colors: array of hex color codes that match the described mood (max 6)
- personality: array of 3-5 adjective descriptors that capture the mood
- visualStyle: array of 3-5 visual style descriptors (e.g., "minimalist", "bold typography", "organic shapes")
- tone: a brief description of the overall tone and feeling (1-2 sentences)
- stylePrompt: a concise image generation style prompt that captures this visual identity (1-2 sentences, suitable for prepending to an image generation prompt)

Return ONLY valid JSON, no markdown fences.`;

      userContent = `Generate a visual identity based on this mood/style description:\n\n${prompt}`;
    }

    const result = await client.chat.send({
      chatGenerationParams: {
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: userContent },
        ],
      },
    });

    const content =
      result.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      throw new Error("No content in LLM response");
    }

    // Parse the JSON from the response
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const brandData = JSON.parse(cleaned);

    return NextResponse.json(brandData);
  } catch (err) {
    console.error("Moodboard error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to analyze brand",
      },
      { status: 500 }
    );
  }
}
