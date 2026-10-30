import { afterEach, describe, expect, it, vi } from "vitest";
import { loadSkySetup, parseSkySetup } from "../data/sky";
import { CaelumManifestDataSource } from "../data/caelumManifest";
import { CaelumApiDataSource } from "../data/caelumApi";

afterEach(() => vi.unstubAllGlobals());

const LENS = {
  projection: "equidistant_fisheye",
  center_x: 0.5,
  center_y: 0.5,
  radius: 0.48,
  fov_deg: 180,
  azimuth_offset_deg: 0,
  mirror: false,
};

describe("sky setup", () => {
  it("reads it from a caelum manifest.json", () => {
    const setup = parseSkySetup({ slug: "cam0", location: { lat: 50.1, lon: 14.4 }, sky: { lens: LENS }, dates: [] });
    expect(setup).toMatchObject({ lat: 50.1, lon: 14.4, elevationM: 0, lens: { fov_deg: 180 } });
  });

  it("reads it from a camera's /api/sky/setup", () => {
    expect(parseSkySetup({ lens: LENS, lat: 50.1, lon: 14.4, elevation_m: 230 })).toMatchObject({ elevationM: 230 });
  });

  it("is absent when the camera does not publish its position or lens", () => {
    expect(parseSkySetup({ slug: "cam0", dates: [] })).toBeUndefined(); // no sky, no location
    expect(parseSkySetup({ sky: { lens: LENS } })).toBeUndefined(); // lens without a position
    expect(parseSkySetup({ location: { lat: 1, lon: 2 } })).toBeUndefined(); // an older caelum: no lens
    expect(parseSkySetup({ location: { lat: 1, lon: 2 }, sky: { lens: { projection: "x" } } })).toBeUndefined();
    expect(parseSkySetup(null)).toBeUndefined();
  });

  it("asks the manifest of a manifest source and the API of a camera", async () => {
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => ({ lens: LENS, lat: 1, lon: 2, location: { lat: 1, lon: 2 }, sky: { lens: LENS } }),
      url,
    }));
    vi.stubGlobal("fetch", fetchMock);

    await loadSkySetup(new CaelumManifestDataSource("https://example.org/cam0/manifest.json"));
    await loadSkySetup(new CaelumApiDataSource("192.168.1.50"));
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      "https://example.org/cam0/manifest.json",
      "http://192.168.1.50:8000/api/sky/setup",
    ]);
  });

  it("never fails: a missing manifest just means no sky", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404 })));
    expect(await loadSkySetup(new CaelumManifestDataSource("https://example.org/cam0/"))).toBeUndefined();
  });
});
