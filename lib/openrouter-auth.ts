const STORAGE_KEY = "openrouter_api_key";
const VERIFIER_KEY = "openrouter_code_verifier";

const isBrowser = typeof window !== "undefined";

type AuthListener = () => void;
const listeners = new Set<AuthListener>();

export function onAuthChange(fn: AuthListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

// Sync auth state across tabs via storage events
if (isBrowser) {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) notifyListeners();
  });
}

export function getApiKey(): string | null {
  if (!isBrowser) return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setApiKey(key: string): void {
  if (!isBrowser) return;
  localStorage.setItem(STORAGE_KEY, key);
  notifyListeners();
}

export function clearApiKey(): void {
  if (!isBrowser) return;
  localStorage.removeItem(STORAGE_KEY);
  notifyListeners();
}

/**
 * Check if an OAuth callback is pending (code_verifier exists in sessionStorage).
 * Used to avoid hijacking unrelated `?code=` query params.
 */
export function hasOAuthCallbackPending(): boolean {
  if (!isBrowser) return false;
  return sessionStorage.getItem(VERIFIER_KEY) !== null;
}

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function computeS256Challenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function initiateOAuth(callbackUrl?: string): Promise<void> {
  const verifier = generateCodeVerifier();
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  const challenge = await computeS256Challenge(verifier);

  const url = callbackUrl ?? window.location.origin + window.location.pathname;
  const params = new URLSearchParams({
    callback_url: url,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  window.location.href = `https://openrouter.ai/auth?${params.toString()}`;
}

export async function handleOAuthCallback(code: string): Promise<void> {
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!verifier) {
    throw new Error("Missing code verifier — OAuth flow may have expired");
  }
  sessionStorage.removeItem(VERIFIER_KEY);

  const res = await fetch("https://openrouter.ai/api/v1/auth/keys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      code_verifier: verifier,
      code_challenge_method: "S256",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Key exchange failed (${res.status}): ${text}`);
  }

  const { key } = await res.json();
  setApiKey(key);
}
