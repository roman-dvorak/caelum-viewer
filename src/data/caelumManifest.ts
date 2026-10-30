import { encodePath, fetchJson, withTrailingSlash } from "./fetch";
import { HttpIndexDataSource } from "./httpIndex";
import type { DataSource, Entry } from "./types";

interface CameraManifest {
  dates: { date: string }[];
}
interface DayIndex {
  images: { thumbnail: string; metadata?: string }[];
}

const MANIFEST_TTL_MS = 30_000;

/**
 * For a plain static host without directory listings, where the caelum
 * uploader publishes `manifest.json` + per-day `thumbnails/Y/M/D/index.json`.
 * Synthesizes directory listings from those files so the rest of the viewer
 * cannot tell the difference. The manifest is only as fresh as the uploader's
 * last run and does not list RAW files, so when the host also serves real
 * directory listings those are merged in: whatever is on the server shows up.
 */
export class CaelumManifestDataSource implements DataSource {
  readonly kind = "caelum-manifest";
  readonly label: string;
  private readonly base: string;
  private manifest?: { at: number; data: Promise<CameraManifest> };
  private readonly index: HttpIndexDataSource;

  constructor(url: string) {
    const abs = new URL(url, location.href).toString();
    this.base = abs.endsWith(".json") ? abs.slice(0, abs.lastIndexOf("/") + 1) : withTrailingSlash(abs);
    this.label = `caelum: ${this.base}`;
    this.index = new HttpIndexDataSource(this.base);
  }

  url(path: string): string {
    return this.base + encodePath(path);
  }

  private dates(signal?: AbortSignal): Promise<CameraManifest> {
    if (!this.manifest || Date.now() - this.manifest.at > MANIFEST_TTL_MS) {
      const data = fetchJson<CameraManifest>(this.url("manifest.json"), signal);
      this.manifest = { at: Date.now(), data };
      data.catch(() => (this.manifest = undefined));
    }
    return this.manifest.data;
  }

  async list(path: string, signal?: AbortSignal): Promise<Entry[]> {
    type Attempt = { entries?: Entry[]; error?: Error };
    const attempt = (p: Promise<Entry[]>): Promise<Attempt> =>
      p.then(
        (entries): Attempt => ({ entries }),
        (error: Error): Attempt => {
          if (error.name === "AbortError") throw error;
          return { error };
        },
      );
    // The host's own directory listing may or may not exist; either source alone is enough.
    const [manifest, listing] = await Promise.all([attempt(this.fromManifest(path, signal)), attempt(this.index.list(path, signal))]);
    if (manifest.entries && listing.entries) return mergeEntries(manifest.entries, listing.entries);
    const entries = manifest.entries ?? listing.entries;
    if (entries) return entries;
    throw manifest.error;
  }

  private async fromManifest(path: string, signal?: AbortSignal): Promise<Entry[]> {
    const parts = path.split("/").filter(Boolean);
    if (parts.length === 0) {
      return [{ name: "thumbnails", path: "thumbnails/", isDir: true }];
    }
    if (parts[0] !== "thumbnails") return [];
    if (parts.length === 4) {
      const index = await fetchJson<DayIndex>(this.url(`${path}index.json`), signal);
      const files = index.images.flatMap((img) => [img.thumbnail, img.metadata ?? ""]);
      return files
        .filter((f) => f.startsWith(path))
        .map((f) => ({ name: f.slice(path.length), path: f, isDir: false }));
    }
    const manifest = await this.dates(signal);
    const names = new Set<string>();
    for (const { date } of manifest.dates) {
      const dateParts = date.split("-");
      if (dateParts.slice(0, parts.length - 1).join("/") === parts.slice(1).join("/")) {
        const next = dateParts[parts.length - 1];
        if (next) names.add(next);
      }
    }
    return [...names].sort().map((name) => ({ name, path: `${path}${name}/`, isDir: true }));
  }
}

/** Union by path; the manifest's entries come first, the listing adds what it does not know about. */
export function mergeEntries(first: Entry[], second: Entry[]): Entry[] {
  const seen = new Set(first.map((e) => e.path));
  return [...first, ...second.filter((e) => !seen.has(e.path))];
}
