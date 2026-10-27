import { buildSearch, readParams, type ViewParams } from "./urlState";

/** A camera (or a whole catalog) opened before, kept per browser so the start screen can offer it again. */
export interface RecentSource {
  /** Camera name, or the catalog title for the camera overview. */
  label: string;
  /** Catalog title when the camera came from a catalog. */
  catalog?: string;
  /** Query string without the view position (date / time / section / live). */
  search: string;
  kind: string;
  at: number;
  /** Pinned entries stay at the top in the order they were pinned and are never dropped. */
  pinned?: boolean;
}

const KEY = "caelum-viewer:recent";
/** How many unpinned entries are kept. */
const MAX = 8;

export function loadRecent(): RecentSource[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(list) ? order(list.filter((r) => typeof r?.search === "string")) : [];
  } catch {
    return [];
  }
}

/** Pinned first (in pinning order), then the newest unpinned ones. */
function order(list: RecentSource[]): RecentSource[] {
  return [...list.filter((r) => r.pinned), ...list.filter((r) => !r.pinned).slice(0, MAX)];
}

function save(list: RecentSource[]): RecentSource[] {
  list = order(list);
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage unavailable (private mode, blocked site data) — nothing to remember.
  }
  return list;
}

/**
 * Records the camera being viewed; `params` must already name the camera for
 * catalog sources. A catalog without `camera` is its overview of all cameras.
 */
export function rememberCamera(label: string, catalog: string | undefined, params: ViewParams = readParams()): void {
  const { date: _d, time: _t, from: _f, to: _to, live: _l, ...rest } = params;
  const search = buildSearch(rest);
  if (!search) return;
  const kind = rest.catalog ? (rest.camera ? "catalog" : "group") : (rest.type ?? "");
  const entry: RecentSource = { label, catalog, search, kind, at: Date.now() };
  const list = loadRecent();
  const old = list.find((r) => r.search === search);
  // A pinned entry keeps its place; anything else moves to the top of the unpinned ones.
  if (old?.pinned) save(list.map((r) => (r === old ? { ...entry, pinned: true } : r)));
  else save([entry, ...list.filter((r) => r !== old)]);
}

export function togglePin(search: string): RecentSource[] {
  const list = loadRecent();
  const hit = list.find((r) => r.search === search);
  if (!hit) return list;
  const rest = list.filter((r) => r !== hit);
  // Newly pinned go to the end of the pinned ones; unpinned rejoin by recency.
  return save(
    hit.pinned
      ? [...rest.filter((r) => r.pinned), ...[{ ...hit, pinned: false }, ...rest.filter((r) => !r.pinned)].sort((a, b) => b.at - a.at)]
      : [...rest.filter((r) => r.pinned), { ...hit, pinned: true }, ...rest.filter((r) => !r.pinned)],
  );
}

export function forgetSource(search: string): RecentSource[] {
  return save(loadRecent().filter((r) => r.search !== search));
}

/** Clears the list except for the pinned entries. */
export function clearRecent(): RecentSource[] {
  return save(loadRecent().filter((r) => r.pinned));
}
