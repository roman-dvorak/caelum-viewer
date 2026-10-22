import { buildSearch, readParams, type ViewParams } from "./urlState";

/** Sources opened before, kept per browser so the start screen can offer them again. */
export interface RecentSource {
  label: string;
  /** Query string without the view position (date / time / live). */
  search: string;
  kind: string;
  at: number;
}

const KEY = "caelum-viewer:recent";
const MAX = 6;

export function loadRecent(): RecentSource[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(list) ? list.filter((r) => typeof r?.search === "string") : [];
  } catch {
    return [];
  }
}

export function rememberSource(label: string, params: ViewParams = readParams()): void {
  const { date: _d, time: _t, live: _l, camera: _c, ...rest } = params;
  const search = buildSearch(rest);
  if (!search) return;
  const kind = rest.catalog ? "catalog" : (rest.type ?? "");
  const next = [{ label, search, kind, at: Date.now() }, ...loadRecent().filter((r) => r.search !== search)].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode, blocked site data) — nothing to remember.
  }
}

export function forgetSource(search: string): RecentSource[] {
  const next = loadRecent().filter((r) => r.search !== search);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}
