import type { LensConfig } from "@roman-dvorak/caelum-sky";
import { fetchJson } from "./fetch";
import type { DataSource } from "./types";

/** What it takes to draw the sky over a camera's frames. */
export interface SkySetup {
  lens: LensConfig;
  lat: number;
  lon: number;
  elevationM: number;
}

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * The lens and position a caelum camera publishes: its static `manifest.json`
 * has `sky.lens` and `location` (only when the operator chose to publish the
 * position), the camera's own API has `/api/sky/setup`. Anything else — an
 * older caelum, a plain archive, no published position — gives `undefined`,
 * and the viewer simply has no sky to offer.
 */
export function parseSkySetup(data: unknown): SkySetup | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as Record<string, unknown>;
  // manifest.json: { sky: { lens }, location: { lat, lon } }; /api/sky/setup: { lens, lat, lon, elevation_m }
  const lens = (d.sky as { lens?: unknown } | undefined)?.lens ?? d.lens;
  const loc = (d.location as Record<string, unknown> | undefined) ?? d;
  if (!lens || typeof lens !== "object" || !finite(loc.lat) || !finite(loc.lon)) return undefined;
  const l = lens as Record<string, unknown>;
  if (![l.center_x, l.center_y, l.radius, l.fov_deg].every(finite) || typeof l.projection !== "string") return undefined;
  return {
    lens: lens as LensConfig,
    lat: loc.lat,
    lon: loc.lon,
    elevationM: finite(loc.elevation_m) ? loc.elevation_m : 0,
  };
}

/** Looks the setup up for a data source; never throws (no sky is not an error). */
export async function loadSkySetup(source: DataSource, signal?: AbortSignal): Promise<SkySetup | undefined> {
  try {
    const url = source.skySetupUrl?.() ?? source.url("manifest.json");
    return parseSkySetup(await fetchJson(url, signal));
  } catch {
    return undefined;
  }
}
