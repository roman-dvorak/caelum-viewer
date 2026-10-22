import { buildSearch, readParams, type ViewParams } from "./urlState";

/** A camera opened before, kept per browser so the start screen can offer it again. */
export interface RecentSource {
  /** Camera name. */
  label: string;
  /** Catalog title when the camera came from a catalog. */
  catalog?: string;
  /** Query string without the view position (date / time / live). */
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
  const { date: _d, time: _t, live: _l, ...rest } = params;
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

/** "před 5 min", "včera", … — coarse, for the recent list. */
export function ago(t: number, now = Date.now()): string {
  const min = Math.round((now - t) / 60_000);
  if (min < 1) return "právě teď";
  if (min < 60) return `před ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `před ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return "včera";
  if (d < 30) return `před ${d} dny`;
  return new Date(t).toLocaleDateString("cs-CZ");
}
