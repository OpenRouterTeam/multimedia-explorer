import { NextRequest, NextResponse } from "next/server";

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
  const index = request.nextUrl.searchParams.get("index") ?? "0";

  try {
    const res = await fetch(
      `${OPENROUTER_VIDEO_URL}/${jobId}/content?index=${index}`,
      {
        headers: {
          Authorization: authHeader,
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Multimedia Explorer",
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to download video content" },
        { status: res.status }
      );
    }

    const blob = await res.blob();
    return new NextResponse(blob, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="video-${jobId}.mp4"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to download video" },
      { status: 500 }
    );
  }
}
