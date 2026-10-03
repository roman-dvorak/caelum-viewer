import type { Frame, FrameMeta } from "../data/archive";
import { numericFields, skyPeriod } from "./metadata";

export interface RangeRule {
  key: string;
  min?: number;
  max?: number;
}

export interface Filters {
  /** Empty = all periods. */
  periods: string[];
  rules: RangeRule[];
  rawOnly: boolean;
}

export const NO_FILTERS: Filters = { periods: [], rules: [], rawOnly: false };

export function isFiltering(f: Filters): boolean {
  return f.periods.length > 0 || f.rawOnly || f.rules.some((r) => r.min !== undefined || r.max !== undefined);
}

/** Frames whose metadata isn't known (yet) fail any metadata-based filter. */
export function applyFilters(frames: Frame[], metaMap: Map<string, FrameMeta>, f: Filters): Frame[] {
  if (!isFiltering(f)) return frames;
  const rules = f.rules.filter((r) => r.min !== undefined || r.max !== undefined);
  return frames.filter((frame) => {
    if (f.rawOnly && !frame.raw) return false;
    if (!f.periods.length && !rules.length) return true;
    const meta = metaMap.get(frame.id);
    if (!meta) return false;
    if (f.periods.length && !f.periods.includes(skyPeriod(meta) ?? "")) return false;
    if (rules.length) {
      const values = numericFields(meta);
      for (const r of rules) {
        const v = values[r.key];
        if (v === undefined) return false;
        if (r.min !== undefined && v < r.min) return false;
        if (r.max !== undefined && v > r.max) return false;
      }
    }
    return true;
  });
}
