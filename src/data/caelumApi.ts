import { fetchOk, withTrailingSlash } from "./fetch";
import type { DataSource, Entry } from "./types";

interface ApiListing {
  entries: { name: string; kind: "dir" | "file"; size?: number; modified_at?: string }[];
}

const DEFAULT_PORT = "8000";

/**
 * Straight from a caelum camera's own HTTP API (`/api/files` for listings,
 * `/api/files/content` for files), e.g. `source=192.168.1.50`. The camera
 * must allow this viewer's origin in CORS and have `auth.preview_access`
 * set to `public` — a cross-site page never gets the camera's login cookie.
 */
export class CaelumApiDataSource implements DataSource {
  readonly kind = "caelum";
  readonly label: string;
  private readonly base: string;

  constructor(address: string) {
    this.base = withTrailingSlash(cameraBaseUrl(address));
    this.label = `kamera: ${this.base}`;
  }

  url(path: string): string {
    return `${this.base}api/files/content?${new URLSearchParams({ path })}`;
  }

  async list(path: string, signal?: AbortSignal): Promise<Entry[]> {
    const q = new URLSearchParams({ path: path.replace(/\/$/, "") });
    const res = await fetchOk(`${this.base}api/files?${q}`, { signal, headers: { Accept: "application/json" } });
    const data = (await res.json()) as ApiListing;
    return data.entries.map((e) => ({
      name: e.name,
      path: path + e.name + (e.kind === "dir" ? "/" : ""),
      isDir: e.kind === "dir",
      size: e.size,
      modified: e.modified_at,
    }));
  }
}

/** `192.168.1.50` → `http://192.168.1.50:8000/`; full URLs are kept as given. */
export function cameraBaseUrl(address: string): string {
  const a = address.trim();
  if (/^https?:\/\//i.test(a)) return a;
  const hasPort = /:\d+(\/|$)/.test(a) || a.startsWith("[");
  return `http://${hasPort ? a : a.replace(/^([^/]+)/, `$1:${DEFAULT_PORT}`)}`;
}
