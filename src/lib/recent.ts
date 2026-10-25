import { buildSearch, readParams, type ViewParams } from "./urlState";

/** A camera opened before, kept per browser so the start screen can offer it again. */
export interface RecentSource {
  /** Camera name. */
  label: string;
  /** Catalog title when the camera came from a catalog. */
  catalog?: string;
  /** Query string without the view position (date / time / section / live). */
  search: string;
  kind: string;
  at: number;
}

const KEY = "caelum-viewer:recent";
const MAX = 8;

export function loadRecent(): RecentSource[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(list) ? list.filter((r) => typeof r?.search === "string") : [];
  } catch {
    return [];
  }
}

function save(list: RecentSource[]): RecentSource[] {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage unavailable (private mode, blocked site data) — nothing to remember.
  }
  return list;
}

/** Records the camera being viewed; `params` must already name the camera for catalog sources. */
export function rememberCamera(label: string, catalog: string | undefined, params: ViewParams = readParams()): void {
  const { date: _d, time: _t, from: _f, to: _to, live: _l, ...rest } = params;
  const search = buildSearch(rest);
  if (!search) return;
  const kind = rest.catalog ? "catalog" : (rest.type ?? "");
  save([{ label, catalog, search, kind, at: Date.now() }, ...loadRecent().filter((r) => r.search !== search)].slice(0, MAX));
}

export function forgetSource(search: string): RecentSource[] {
  return save(loadRecent().filter((r) => r.search !== search));
}

export function clearRecent(): RecentSource[] {
  return save([]);
}
