/**
 * Parse a Response body as JSON, falling back to a truncated text snippet when the
 * body isn't valid JSON (e.g. proxy errors like "Request Entity Too Large", upstream
 * HTML error pages, or empty bodies). Prevents "Unexpected token ... is not valid JSON"
 * from leaking to users and preserves the original status for error messaging.
 */
export async function parseJsonResponse<T = unknown>(
  res: Response,
): Promise<{ ok: boolean; status: number; data: T | null; text: string }> {
  const text = await res.text();
  if (!text) {
    return { ok: res.ok, status: res.status, data: null, text: "" };
  }
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) as T, text };
  } catch {
    return { ok: res.ok, status: res.status, data: null, text };
  }
}

/** Short, user-facing fallback when a non-JSON error body is returned. */
export function fallbackErrorMessage(status: number, text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  const snippet = trimmed.length > 200 ? `${trimmed.slice(0, 200)}…` : trimmed;

  if (status === 413) return "Request too large — try smaller or fewer reference images.";
  if (status === 429) return "Rate limited — please wait a moment and try again.";
  if (status === 401 || status === 403) return "Authentication failed — please sign in again.";
  if (status >= 500) return `Upstream error (${status})${snippet ? `: ${snippet}` : ""}`;
  if (snippet) return `Error ${status}: ${snippet}`;
  return `Request failed with status ${status}`;
}
