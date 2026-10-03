import type { FrameMeta } from "../data/archive";

export interface FieldInfo {
  label: string;
  unit?: string;
  digits?: number;
}

/** Nicer names for the fields caelum writes; anything else is shown by key. */
export const KNOWN_FIELDS: Record<string, FieldInfo> = {
  exposure_s: { label: "Expozice", unit: "s", digits: 4 },
  exposure_us: { label: "Expozice", unit: "µs", digits: 0 },
  analogue_gain: { label: "Gain", unit: "×", digits: 2 },
  focus_score: { label: "Ostrost (focus score)", digits: 1 },
  "sky_state.sun_altitude_deg": { label: "Výška Slunce", unit: "°", digits: 1 },
  "sky_state.sun_azimuth_deg": { label: "Azimut Slunce", unit: "°", digits: 1 },
  "sky_state.moon_altitude_deg": { label: "Výška Měsíce", unit: "°", digits: 1 },
  "sky_state.moon_azimuth_deg": { label: "Azimut Měsíce", unit: "°", digits: 1 },
  "sky_state.moon_illumination": { label: "Osvětlení Měsíce", digits: 2 },
  "exposure_control.measured_ev": { label: "Naměřený jas", unit: "EV", digits: 2 },
  "exposure_control.target_ev": { label: "Cílový jas", unit: "EV", digits: 2 },
  "exposure_control.p99_ev": { label: "Jas p99", unit: "EV", digits: 2 },
  "exposure_control.error_ev": { label: "Chyba regulace", unit: "EV", digits: 2 },
  "exposure_control.applied_ev": { label: "Aplikováno", unit: "EV", digits: 2 },
  "exposure_control.output_ev": { label: "Výstup regulátoru", unit: "EV", digits: 2 },
};

export const DEFAULT_CHART_FIELDS = [
  "exposure_s",
  "analogue_gain",
  "sky_state.sun_altitude_deg",
  "exposure_control.measured_ev",
  "focus_score",
];

export function fieldInfo(key: string): FieldInfo {
  return KNOWN_FIELDS[key] ?? { label: key };
}

export function formatValue(key: string, v: number | undefined): string {
  if (v === undefined || Number.isNaN(v)) return "—";
  const info = fieldInfo(key);
  const digits = info.digits ?? (Math.abs(v) >= 100 ? 1 : 3);
  return `${v.toFixed(digits)}${info.unit ? ` ${info.unit}` : ""}`;
}

/** Every numeric leaf as a dotted key (overlay elements skipped — they
 *  duplicate other fields), plus `exposure_s` derived from `exposure_us`. */
export function numericFields(meta: FrameMeta): Record<string, number> {
  const out: Record<string, number> = {};
  const walk = (obj: Record<string, unknown>, prefix: string) => {
    for (const [k, v] of Object.entries(obj)) {
      if (k === "overlay_elements") continue;
      const key = prefix + k;
      if (typeof v === "number" && Number.isFinite(v)) out[key] = v;
      else if (v && typeof v === "object" && !Array.isArray(v)) walk(v as Record<string, unknown>, `${key}.`);
    }
  };
  walk(meta, "");
  if (out.exposure_us !== undefined) out.exposure_s = out.exposure_us / 1e6;
  return out;
}

export function skyPeriod(meta: FrameMeta | undefined): string | undefined {
  const sky = meta?.sky_state as Record<string, unknown> | undefined;
  return typeof sky?.period === "string" ? sky.period : undefined;
}

export const PERIODS: Record<string, { label: string; color: string }> = {
  day: { label: "Den", color: "#f5c542" },
  civil_twilight: { label: "Občanský soumrak", color: "#e88a3c" },
  nautical_twilight: { label: "Nautický soumrak", color: "#8a5cd6" },
  astronomical_twilight: { label: "Astronomický soumrak", color: "#4a5fc1" },
  night: { label: "Noc", color: "#2b3a67" },
};

export function periodColor(period: string | undefined): string {
  return (period && PERIODS[period]?.color) || "#5c6b8a";
}

/** Flattened view (all leaves, including strings/booleans) for the table. */
export function flattenAll(meta: FrameMeta): [string, string][] {
  const out: [string, string][] = [];
  const walk = (obj: Record<string, unknown>, prefix: string) => {
    for (const [k, v] of Object.entries(obj)) {
      if (k === "overlay_elements") continue;
      const key = prefix + k;
      if (v && typeof v === "object" && !Array.isArray(v)) walk(v as Record<string, unknown>, `${key}.`);
      else out.push([key, typeof v === "number" ? formatValue(key, v) : typeof v === "string" ? v : JSON.stringify(v)]);
    }
  };
  walk(meta, "");
  return out;
}
