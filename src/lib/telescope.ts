/** Where the telescope pointed at a frame, read from the `telescope_marker`
 * overlay element caelum's `telescope_position` plugin stores in the sidecar.
 * RA/Dec is kept (not the pixel), so the crosshair is drawn by the sky layer
 * through the lens and stays right if the lens is recalibrated. */
export type TelescopeStatus = "tracking" | "slewing" | "idle" | "parked" | "disconnected" | "error" | "offline";

export interface TelescopePointing {
  status: TelescopeStatus;
  raDeg?: number;
  decDeg?: number;
  epoch?: "j2000" | "jnow";
  altDeg?: number;
  azDeg?: number;
  label?: string;
}

const STATUSES: readonly string[] = ["tracking", "slewing", "idle", "parked", "disconnected", "error", "offline"];

const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

export function telescopeFromMeta(meta: unknown): TelescopePointing | undefined {
  const elements = (meta as { overlay_elements?: unknown } | undefined)?.overlay_elements;
  if (!Array.isArray(elements)) return undefined;
  for (const el of elements) {
    if (!el || typeof el !== "object" || (el as { type?: unknown }).type !== "telescope_marker") continue;
    const p = (el as { payload?: Record<string, unknown> }).payload ?? {};
    const status = typeof p.status === "string" && STATUSES.includes(p.status) ? (p.status as TelescopeStatus) : "idle";
    const pointing: TelescopePointing = {
      status,
      raDeg: num(p.ra_deg),
      decDeg: num(p.dec_deg),
      epoch: p.epoch === "j2000" ? "j2000" : "jnow",
      altDeg: num(p.alt_deg),
      azDeg: num(p.az_deg),
      label: typeof p.label === "string" ? p.label : undefined,
    };
    if ((pointing.raDeg !== undefined && pointing.decDeg !== undefined) || (pointing.altDeg !== undefined && pointing.azDeg !== undefined)) {
      return pointing;
    }
  }
  return undefined;
}
