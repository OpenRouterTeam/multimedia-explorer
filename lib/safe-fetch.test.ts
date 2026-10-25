import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createServer, type Server } from "node:http";
import {
  FetchLimitError,
  UnsafeUrlError,
  fetchPublicHtml,
  isPublicIp,
  parsePublicHttpUrl,
} from "./safe-fetch";

describe("isPublicIp", () => {
  test("rejects loopback, private, link-local, CGNAT and reserved ranges", () => {
    for (const ip of [
      "127.0.0.1", "127.1.2.3", "10.0.0.1", "172.16.0.1", "172.31.255.255",
      "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1",
      "255.255.255.255", "198.18.0.1", "::1", "::", "fe80::1", "fc00::1", "fd12::1",
      "::ffff:127.0.0.1", "::ffff:10.0.0.1", "64:ff9b::7f00:1", "ff02::1",
    ]) {
      expect(isPublicIp(ip)).toBe(false);
    }
  });
  test("accepts public addresses", () => {
    for (const ip of ["1.1.1.1", "8.8.8.8", "172.32.0.1", "100.128.0.1", "2606:4700::1111"]) {
      expect(isPublicIp(ip)).toBe(true);
    }
  });
  test("rejects non-addresses", () => {
    expect(isPublicIp("localhost")).toBe(false);
    expect(isPublicIp("")).toBe(false);
  });
});

describe("parsePublicHttpUrl", () => {
  test("rejects non-http schemes, credentials, ports and garbage", () => {
    for (const raw of [
      "file:///etc/passwd", "ftp://example.com/", "gopher://example.com/",
      "http://user:pw@example.com/", "not a url",
    ]) {
      expect(() => parsePublicHttpUrl(raw)).toThrow(UnsafeUrlError);
    }
  });
  test("accepts plain http(s) URLs", () => {
    expect(parsePublicHttpUrl("https://example.com/a?b=c").hostname).toBe("example.com");
  });
});

describe("fetchPublicHtml", () => {
  let server: Server;
  let base: string;
  const allowLoopback = (ip: string) => ip === "127.0.0.1" || ip === "::1";

  beforeAll(async () => {
    server = createServer((req, res) => {
      if (req.url === "/redirect-private") {
        res.writeHead(302, { Location: "http://169.254.169.254/latest/" });
        res.end();
      } else if (req.url === "/redirect-ok") {
        res.writeHead(302, { Location: "/page" });
        res.end();
      } else if (req.url === "/loop") {
        res.writeHead(302, { Location: "/loop" });
        res.end();
      } else if (req.url === "/compressed") {
        res.writeHead(200, { "Content-Encoding": "br", "Content-Type": "text/html" });
        res.end(Buffer.from([0x0b, 0x01, 0x80]));
      } else if (req.url === "/big") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("A".repeat(200_000));
      } else if (req.url === "/slow") {
        setTimeout(() => res.end("late"), 2_000);
      } else {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`<html>${req.headers["accept-encoding"]}</html>`);
      }
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("no port");
    base = `http://127.0.0.1:${address.port}`;
  });
  afterAll(() => server.close());

  const opts = { isAddressAllowed: allowLoopback };
  const withPort = (path: string) => `${base}${path}`;

  test("blocks loopback by default even when the URL is well formed", async () => {
    await expect(fetchPublicHtml("http://127.0.0.1/", {})).rejects.toBeInstanceOf(UnsafeUrlError);
  });
  test("blocks a redirect to a private address", async () => {
    await expect(fetchPublicHtml(withPort("/redirect-private"), opts)).rejects.toBeInstanceOf(UnsafeUrlError);
  });
  test("follows a same-host redirect and asks for identity encoding", async () => {
    const html = await fetchPublicHtml(withPort("/redirect-ok"), opts);
    expect(html).toBe("<html>identity</html>");
  });
  test("stops redirect loops", async () => {
    await expect(fetchPublicHtml(withPort("/loop"), opts)).rejects.toBeInstanceOf(FetchLimitError);
  });
  test("refuses compressed bodies without decoding them", async () => {
    await expect(fetchPublicHtml(withPort("/compressed"), opts)).rejects.toBeInstanceOf(FetchLimitError);
  });
  test("caps the body size", async () => {
    const html = await fetchPublicHtml(withPort("/big"), { ...opts, maxBytes: 1024 });
    expect(html.length).toBe(1024);
  });
  test("times out", async () => {
    await expect(fetchPublicHtml(withPort("/slow"), { ...opts, timeoutMs: 200 })).rejects.toThrow();
  });
});
