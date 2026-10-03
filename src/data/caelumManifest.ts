import { encodePath, fetchJson, withTrailingSlash } from "./fetch";
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
 * cannot tell the difference. RAW files are not enumerated by the manifest,
 * so `raw/` lists as empty.
 */
export class CaelumManifestDataSource implements DataSource {
  readonly kind = "caelum-manifest";
  readonly label: string;
  private readonly base: string;
  private manifest?: { at: number; data: Promise<CameraManifest> };

  constructor(url: string) {
    const abs = new URL(url, location.href).toString();
    this.base = abs.endsWith(".json") ? abs.slice(0, abs.lastIndexOf("/") + 1) : withTrailingSlash(abs);
    this.label = `caelum: ${this.base}`;
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
