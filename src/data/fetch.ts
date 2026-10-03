import { HttpError } from "./types";

/**
 * fetch() that turns the opaque "TypeError: Failed to fetch" (almost always
 * CORS or an unreachable host when the viewer runs on another domain) into
 * a message that says so.
 */
export async function fetchOk(url: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, init);
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
