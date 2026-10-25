import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import type { LookupFunction } from "node:net";
import { isIP } from "node:net";

export const MAX_REDIRECTS = 3;
export const MAX_BODY_BYTES = 64 * 1024;
export const FETCH_TIMEOUT_MS = 10_000;

const USER_AGENT =
  "Mozilla/5.0 (compatible; MediaPlayground/1.0; +https://github.com/openrouter)";

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

export class FetchLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FetchLimitError";
  }
}

type AddressPolicy = (address: string) => boolean;

export interface SafeFetchOptions {
  isAddressAllowed?: AddressPolicy;
  timeoutMs?: number;
  maxBytes?: number;
}

/** True for globally routable unicast addresses only. */
export function isPublicIp(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return isPublicIpv4(address);
  if (family === 6) return isPublicIpv6(address);
  return false;
}

function isPublicIpv4(address: string): boolean {
  const [a, b] = address.split(".").map(Number);
  if (a === 0 || a === 10 || a === 127) return false;
  if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT
  if (a === 169 && b === 254) return false; // link-local / metadata
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 192 && b === 0) return false; // 192.0.0.0/24, 192.0.2.0/24
  if (a === 198 && (b === 18 || b === 19)) return false; // benchmarking
  if (a === 198 && b === 51) return false; // 198.51.100.0/24
  if (a === 203 && b === 0) return false; // 203.0.113.0/24
  if (a >= 224) return false; // multicast, reserved, broadcast
  return true;
}

function isPublicIpv6(address: string): boolean {
  const lower = address.toLowerCase();
  const mapped = lower.match(/^(?:0*:)*ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPublicIpv4(mapped[1]);
  if (lower.startsWith("64:ff9b:")) return false; // NAT64
  // Only global unicast 2000::/3 is allowed; this excludes ::, ::1,
  // fc00::/7, fe80::/10, ff00::/8 and documentation ranges.
  const firstHextet = parseInt(lower.split(":")[0] || "0", 16);
  if (firstHextet < 0x2000 || firstHextet > 0x3fff) return false;
  if (lower.startsWith("2001:db8:")) return false;
  return true;
}

/** Accepts only http(s) URLs with no embedded credentials. */
export function parsePublicHttpUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError("Invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError("Only http and https URLs are supported");
  }
  if (url.username || url.password) {
    throw new UnsafeUrlError("URLs with credentials are not supported");
  }
  return url;
}

async function resolvePinnedAddress(
  hostname: string,
  isAddressAllowed: AddressPolicy
): Promise<{ address: string; family: 4 | 6 }> {
  const literal = hostname.startsWith("[") ? hostname.slice(1, -1) : hostname;
  if (isIP(literal)) {
    if (!isAddressAllowed(literal)) {
      throw new UnsafeUrlError("Destination address is not allowed");
    }
    return { address: literal, family: isIP(literal) as 4 | 6 };
  }
  const answers = await lookup(hostname, { all: true, verbatim: true });
  if (answers.length === 0) throw new UnsafeUrlError("Host did not resolve");
  if (!answers.every((a) => isAddressAllowed(a.address))) {
    throw new UnsafeUrlError("Destination address is not allowed");
  }
  return { address: answers[0].address, family: answers[0].family as 4 | 6 };
}

function pinnedLookup(address: string, family: 4 | 6): LookupFunction {
  return (_hostname, options, callback) => {
    if (typeof options === "object" && options.all) {
      (callback as unknown as (
        err: null,
        addresses: { address: string; family: number }[]
      ) => void)(null, [{ address, family }]);
      return;
    }
    callback(null, address, family);
  };
}

function requestOnce(
  url: URL,
  address: string,
  family: 4 | 6,
  signal: AbortSignal,
  maxBytes: number
): Promise<{ status: number; location: string | null; body: string }> {
  const request = url.protocol === "https:" ? httpsRequest : httpRequest;
  return new Promise((resolve, reject) => {
    const req = request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method: "GET",
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
          "Accept-Encoding": "identity",
        },
        lookup: pinnedLookup(address, family),
        signal,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const location = res.headers.location ?? null;
        const encoding = res.headers["content-encoding"];
        if (encoding && encoding !== "identity") {
          res.destroy();
          reject(new FetchLimitError("Compressed responses are not supported"));
          return;
        }
        if (status >= 300 && status < 400) {
          res.resume();
          resolve({ status, location, body: "" });
          return;
        }
        const chunks: Buffer[] = [];
        let received = 0;
        res.on("data", (chunk: Buffer) => {
          received += chunk.length;
          if (received > maxBytes) {
            chunks.push(chunk.subarray(0, chunk.length - (received - maxBytes)));
            res.destroy();
            resolve({ status, location, body: Buffer.concat(chunks).toString("utf8") });
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () =>
          resolve({ status, location, body: Buffer.concat(chunks).toString("utf8") })
        );
        res.on("error", reject);
      }
    );
    req.on("error", reject);
    req.end();
  });
}

/**
 * Fetches a public web page as text with SSRF protections: http(s) only,
 * every DNS answer must be a public address, the connection
 * is pinned to the vetted address, redirects are re-validated per hop,
 * compressed bodies are refused, and the read is capped in time and bytes.
 */
export async function fetchPublicHtml(
  rawUrl: string,
  options: SafeFetchOptions = {}
): Promise<string> {
  const isAddressAllowed = options.isAddressAllowed ?? isPublicIp;
  const maxBytes = options.maxBytes ?? MAX_BODY_BYTES;
  const signal = AbortSignal.timeout(options.timeoutMs ?? FETCH_TIMEOUT_MS);

  let url = parsePublicHttpUrl(rawUrl);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const { address, family } = await resolvePinnedAddress(url.hostname, isAddressAllowed);
    const result = await requestOnce(url, address, family, signal, maxBytes);
    if (result.status >= 300 && result.status < 400) {
      if (!result.location) throw new FetchLimitError("Redirect without location");
      url = parsePublicHttpUrl(new URL(result.location, url).toString());
      continue;
    }
    return result.body;
  }
  throw new FetchLimitError("Too many redirects");
}
