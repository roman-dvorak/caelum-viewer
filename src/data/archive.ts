import { fetchJson } from "./fetch";
import { HttpError, DEFAULT_LAYOUT, type ArchiveLayout, type DataSource, type Entry } from "./types";

export interface Frame {
  /** File stem shared by preview, sidecar and RAW, e.g. 20261003-193012. */
  id: string;
  /** Capture time, ms since epoch (UTC). */
  t: number;
  thumb?: string;
  meta?: string;
  raw?: string;
  rawMeta?: string;
}

export type FrameMeta = Record<string, unknown>;

const IMAGE_EXT = new Set(["webp", "jpg", "jpeg", "png", "avif"]);
const RAW_EXT = new Set(["dng", "fits", "fit"]);

/**
 * Camera-level view of a DataSource: which dates exist, which frames a date
 * has, and each frame's metadata. Everything storage-specific stays behind
 * `DataSource.list` / `DataSource.url`.
 */
export class CameraArchive {
  readonly layout: ArchiveLayout;
  private metaCache = new Map<string, Promise<FrameMeta>>();

  constructor(
    readonly source: DataSource,
    layout?: Partial<ArchiveLayout>,
  ) {
    this.layout = { ...DEFAULT_LAYOUT, ...layout };
  }

  /** All dates (YYYY-MM-DD, ascending) that have a preview directory. */
  async listDates(signal?: AbortSignal): Promise<string[]> {
    const segments = this.layout.thumbnails.split("/").filter(Boolean);
    const found = new Set<string>();
    const walk = async (level: number, path: string, captured: Record<string, string>) => {
      if (level === segments.length) {
        const { YYYY, MM, DD } = captured;
        if (YYYY && MM && DD) found.add(`${YYYY}-${MM}-${DD}`);
        return;
      }
      const segment = segments[level];
      const pattern = segmentPattern(segment);
      if (!pattern) return walk(level + 1, `${path}${segment}/`, captured);
      const entries = await listOrEmpty(this.source, path, signal);
      await Promise.all(
        entries
          .filter((e) => e.isDir)
          .map((e) => {
            const m = pattern.exec(e.name);
            return m ? walk(level + 1, e.path, { ...captured, ...m.groups }) : undefined;
          }),
      );
    };
    await walk(0, "", {});
    return [...found].sort();
  }

  async listFrames(date: string, signal?: AbortSignal): Promise<Frame[]> {
    const thumbDir = dirForDate(this.layout.thumbnails, date);
    const rawDir = dirForDate(this.layout.raw, date);
    const [thumbs, raws] = await Promise.all([
      listOrEmpty(this.source, thumbDir, signal),
      rawDir === thumbDir ? Promise.resolve([]) : listOrEmpty(this.source, rawDir, signal),
    ]);
    const frames = new Map<string, Frame>();
    const add = (entries: Entry[], fromRaw: boolean) => {
      for (const e of entries) {
        if (e.isDir) continue;
        const dot = e.name.lastIndexOf(".");
        if (dot <= 0) continue;
        const stem = e.name.slice(0, dot);
        const ext = e.name.slice(dot + 1).toLowerCase();
        const t = timeFromName(stem);
        if (t === undefined) continue;
        const f = frames.get(stem) ?? { id: stem, t };
        if (IMAGE_EXT.has(ext) && !fromRaw) f.thumb ??= e.path;
        else if (RAW_EXT.has(ext)) f.raw ??= e.path;
        else if (ext === "json") {
          if (fromRaw) f.rawMeta = e.path;
          else f.meta = e.path;
        } else continue;
        frames.set(stem, f);
      }
    };
    add(thumbs, false);
    add(raws, true);
    return [...frames.values()].filter((f) => f.thumb || f.raw).sort((a, b) => a.t - b.t);
  }

  metadata(frame: Frame, signal?: AbortSignal): Promise<FrameMeta> | undefined {
    const path = frame.meta ?? frame.rawMeta;
    if (!path) return undefined;
    const url = this.source.url(path);
    let p = this.metaCache.get(url);
    if (!p) {
      p = fetchJson<FrameMeta>(url, signal);
      this.metaCache.set(url, p);
      p.catch(() => this.metaCache.delete(url));
    }
    return p;
  }
}

async function listOrEmpty(source: DataSource, path: string, signal?: AbortSignal): Promise<Entry[]> {
  try {
    return await source.list(path, signal);
  } catch (err) {
    if (err instanceof HttpError && (err.status === 404 || err.status === 403)) return [];
    throw err;
  }
}

const PLACEHOLDERS: Record<string, string> = {
  "{YYYY}": "(?<YYYY>\\d{4})",
  "{MM}": "(?<MM>\\d{2})",
  "{DD}": "(?<DD>\\d{2})",
};

/** null for a literal segment, otherwise a regex capturing date parts. */
export function segmentPattern(segment: string): RegExp | null {
  if (!/\{(YYYY|MM|DD)\}/.test(segment)) return null;
  const parts = segment.split(/(\{YYYY\}|\{MM\}|\{DD\})/);
  const src = parts.map((p) => PLACEHOLDERS[p] ?? p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("");
  return new RegExp(`^${src}$`);
}

export function dirForDate(template: string, date: string): string {
  const [YYYY, MM, DD] = date.split("-");
  return template.replaceAll("{YYYY}", YYYY).replaceAll("{MM}", MM).replaceAll("{DD}", DD);
}

/** `YYYYMMDD-HHMMSS` anywhere in the name (caelum: `20261003-193012[_extra]`). */
export function timeFromName(name: string): number | undefined {
  const m = /(\d{4})(\d{2})(\d{2})[-_T]?(\d{2})(\d{2})(\d{2})/.exec(name);
  if (!m) return undefined;
  const [, y, mo, d, h, mi, s] = m.map(Number);
  const t = Date.UTC(y, mo - 1, d, h, mi, s);
  return Number.isNaN(t) ? undefined : t;
}
