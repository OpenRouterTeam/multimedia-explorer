import { NextRequest, NextResponse } from "next/server";
import { parseJsonResponse, fallbackErrorMessage } from "@/lib/safe-json";

const OPENROUTER_VIDEO_URL = "https://openrouter.ai/api/v1/videos";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing API key" }, { status: 401 });
  }

  const { jobId } = await params;

  try {
    const res = await fetch(`${OPENROUTER_VIDEO_URL}/${jobId}`, {
      headers: {
        Authorization: authHeader,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Multimedia Explorer",
      },
    });

    const { ok, status, data, text } = await parseJsonResponse<{
      error?: string | { message?: string };
    }>(res);

    if (!ok || !data) {
      const errMsg = data?.error
        ? typeof data.error === "string"
          ? data.error
          : data.error.message || fallbackErrorMessage(status, text)
        : fallbackErrorMessage(status, text);
      return NextResponse.json({ error: errMsg }, { status });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to poll video status" },
      { status: 500 }
    );
  }
}
