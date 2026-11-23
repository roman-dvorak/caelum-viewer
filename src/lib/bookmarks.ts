import { useSyncExternalStore } from "react";
import { sourceOf } from "./recent";
import { dayStart, utcDate, utcTime } from "./time";
import { buildSearch, readParams, type ViewParams } from "./urlState";

/**
 * Kept per browser, two kinds:
 * - a marked moment (no `frame`): it belongs to a time, not to a camera —
 *   every timeline shows the bookmarks of its day, whichever catalog or
 *   camera is open;
 * - a liked frame (`frame` set): one picture of one camera, shown on that
 *   camera's timeline only.
 * Where it was made is kept so the start screen can reopen it.
 */
export interface Bookmark {
  id: string;
  /** The marked moment, ms since epoch (UTC). */
  t: number;
  /** The user's own description. */
  note?: string;
  /** Camera name, or the catalog title for the overview, where it was marked. */
  label: string;
  /** Catalog title when marked on a camera of a catalog. */
  catalog?: string;
  /** Query string of that view (for a liked frame: of its camera) without the view position or mode. */
  search: string;
  kind: string;
  created: number;
  /** A liked frame: its id (file stem) and the URL of its preview. */
  frame?: { id: string; src?: string };
}

/** A liked frame. */
export type Like = Bookmark & { frame: { id: string; src?: string } };
export const isLike = (b: Bookmark): b is Like => !!b.frame;

const KEY = "caelum-viewer:bookmarks";
/** A bookmark this close to a frame counts as being on it (frames are seconds to minutes apart). */
export const NEAR_MS = 30_000;

let cache: Bookmark[] | undefined;
const listeners = new Set<() => void>();

function read(): Bookmark[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(list)) return [];
    return sort(
      list.filter(
        (b) =>
          typeof b?.id === "string" &&
          typeof b.t === "number" &&
          Number.isFinite(b.t) &&
          typeof b.search === "string" &&
          (b.frame === undefined || typeof b.frame?.id === "string"),
      ),
    );
  } catch {
    return [];
  }
}

const sort = (list: Bookmark[]) => [...list].sort((a, b) => a.t - b.t);

/** All bookmarks, oldest moment first. The same array until something changes. */
export function loadBookmarks(): Bookmark[] {
  return (cache ??= read());
}

function save(list: Bookmark[]): Bookmark[] {
  cache = sort(list);
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Storage unavailable (private mode, blocked site data) — kept for this page only.
  }
  listeners.forEach((l) => l());
  return cache;
}

export function subscribeBookmarks(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Another tab changed them.
if (typeof window !== "undefined")
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY && e.key !== null) return;
    cache = undefined;
    listeners.forEach((l) => l());
  });

/** The bookmarks, re-rendering on every change (in this tab or another). */
export function useBookmarks(): Bookmark[] {
  return useSyncExternalStore(subscribeBookmarks, loadBookmarks, loadBookmarks);
}

/** Where a bookmark points: the source of `params` without the view position and mode. */
export function placeOf(params: ViewParams): { search: string; kind: string } {
  return sourceOf({ ...params, mode: undefined });
}

/**
 * Marks moment `t` in the view described by `params` (the current URL by
 * default); with `frame`, likes that frame of the camera `params` name.
 */
export function addBookmark(
  t: number,
  label: string,
  catalog: string | undefined,
  params: ViewParams = readParams(),
  frame?: Bookmark["frame"],
): Bookmark {
  const { search, kind } = placeOf(params);
  const b: Bookmark = { id: newId(), t, label, catalog, search, kind, created: Date.now(), ...(frame ? { frame } : {}) };
  save([...loadBookmarks(), b]);
  return b;
}

export function removeBookmark(id: string): Bookmark[] {
  return save(loadBookmarks().filter((b) => b.id !== id));
}

export function setBookmarkNote(id: string, note: string): Bookmark[] {
  const text = note.trim();
  return save(loadBookmarks().map((b) => (b.id === id ? { ...b, note: text || undefined } : b)));
}

/** The marked moment closest to `t`, if one is within `tolerance` (liked frames don't count). */
export function bookmarkNear(list: Bookmark[], t: number | undefined, tolerance = NEAR_MS): Bookmark | undefined {
  if (t === undefined) return undefined;
  let best: Bookmark | undefined;
  for (const b of list)
    if (!b.frame && Math.abs(b.t - t) <= tolerance && (!best || Math.abs(b.t - t) < Math.abs(best.t - t))) best = b;
  return best;
}

/** The like of frame `frameId` of the camera at `search` (see `placeOf`). */
export function likeOf(list: Bookmark[], search: string, frameId: string | undefined): Like | undefined {
  return frameId === undefined ? undefined : list.find((b): b is Like => isLike(b) && b.frame.id === frameId && b.search === search);
}

/** Within the UTC day `date`: every marked moment, and the liked frames of the cameras at `sources`. */
export function bookmarksOn(list: Bookmark[], date: string, sources: readonly string[] = []): Bookmark[] {
  const start = dayStart(date);
  return list.filter((b) => b.t >= start && b.t < start + 86_400_000 && (!b.frame || sources.includes(b.search)));
}

/** Link that opens the bookmark where it was made, at its moment. */
export function bookmarkHref(b: Bookmark): string {
  return buildSearch({ ...readParams(b.search), date: utcDate(b.t), time: utcTime(b.t), live: undefined });
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
