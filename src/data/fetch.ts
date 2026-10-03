import { HttpError } from "./types";

/**
 * fetch() that turns the opaque "TypeError: Failed to fetch" (almost always
 * CORS or an unreachable host when the viewer runs on another domain) into
 * a message that says so.
 */
export async function fetchOk(url: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, { ...localNetworkHint(url), ...init });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new Error(
      `Nelze načíst ${url} — server je nedostupný nebo nepovoluje CORS pro tuto doménu.`,
    );
  }
  if (!res.ok) throw new HttpError(url, res.status);
  return res;
}

export async function fetchJson<T = unknown>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetchOk(url, { signal, headers: { Accept: "application/json" } });
  return (await res.json()) as T;
}

export function withTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

/** Encodes each path segment but keeps the slashes. */
export function encodePath(path: string): string {
  return path
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/");
}

/**
 * Chrome's Local Network Access: a page on https (GitHub Pages) may only
 * reach a camera on the LAN over plain http when the request declares it is
 * aimed at the local network; the browser then asks the user once for
 * permission. Other browsers ignore the unknown option.
 */
export function localNetworkHint(url: string): RequestInit {
  try {
    const host = new URL(url, location.href).hostname;
    if (isLocalHost(host)) return { targetAddressSpace: "local" } as RequestInit;
  } catch {
    /* relative/invalid URL — no hint */
  }
  return {};
}

export function isLocalHost(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  return (
    h.endsWith(".local") ||
    h.endsWith(".lan") ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    /^169\.254\./.test(h) ||
    /^f[cd][0-9a-f]{2}:/.test(h) ||
    h.startsWith("fe80:")
  );
}
