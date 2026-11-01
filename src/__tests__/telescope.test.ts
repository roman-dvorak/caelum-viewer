import { describe, expect, it } from "vitest";
import { telescopeFromMeta } from "../lib/telescope";

const el = (payload: Record<string, unknown>, type = "telescope_marker") => ({ overlay_elements: [{ type, payload }] });

describe("telescopeFromMeta", () => {
  it("reads the pointing and status from the sidecar", () => {
    expect(telescopeFromMeta(el({ ra_deg: 90, dec_deg: -10, epoch: "jnow", status: "slewing", label: "C14", x: 0.4 }))).toEqual({
      status: "slewing", raDeg: 90, decDeg: -10, epoch: "jnow", altDeg: undefined, azDeg: undefined, label: "C14",
    });
  });

  it("keeps a pointing that is below the horizon (no pixel) and falls back to alt/az", () => {
    expect(telescopeFromMeta(el({ alt_deg: -5, az_deg: 120, status: "idle" }))).toMatchObject({ altDeg: -5, azDeg: 120 });
  });

  it("is absent without a marker or without any pointing", () => {
    expect(telescopeFromMeta(undefined)).toBeUndefined();
    expect(telescopeFromMeta({ overlay_elements: [] })).toBeUndefined();
    expect(telescopeFromMeta(el({ status: "offline" }))).toBeUndefined();
    expect(telescopeFromMeta(el({ alt_deg: 1, az_deg: 2 }, "sky_map"))).toBeUndefined();
  });

  it("treats an unknown status as idle", () => {
    expect(telescopeFromMeta(el({ alt_deg: 1, az_deg: 2, status: "wat" }))?.status).toBe("idle");
  });
});
