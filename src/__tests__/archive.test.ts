import { describe, expect, it } from "vitest";
import { CameraArchive, segmentPattern, timeFromName } from "../data/archive";
import type { DataSource, Entry } from "../data/types";
import { applyFilters } from "../lib/filters";
import { nearestIndex } from "../lib/time";
import { buildSearch, cameraFromParams, readParams } from "../lib/urlState";

/** In-memory DataSource over a flat list of file paths. */
function memorySource(files: string[]): DataSource {
  return {
    kind: "memory",
    label: "memory",
    url: (p) => `mem://${p}`,
    async list(path) {
      const out = new Map<string, Entry>();
      for (const f of files) {
        if (!f.startsWith(path)) continue;
        const rest = f.slice(path.length);
        const [name, ...more] = rest.split("/");
        const isDir = more.length > 0;
        out.set(name, { name, isDir, path: path + name + (isDir ? "/" : "") });
      }
      return [...out.values()];
    },
  };
}

const FILES = [
  "thumbnails/2026/10/02/20261002-235959.webp",
  "thumbnails/2026/10/03/20261003-000047.webp",
  "thumbnails/2026/10/03/20261003-000047.json",
  "thumbnails/2026/10/03/20261003-000151.webp",
  "thumbnails/2026/10/03/index.json",
  "thumbnails/2026/09/30/20260930-120000.webp",
  "thumbnails/notes/readme.txt",
  "raw/2026/10/03/20261003-000047.dng",
  "raw/2026/10/03/20261003-000047.json",
  "raw/2026/10/03/20261003-000300.dng",
];

describe("CameraArchive", () => {
  it("discovers dates from the layout template", async () => {
    const a = new CameraArchive(memorySource(FILES));
    expect(await a.listDates()).toEqual(["2026-09-30", "2026-10-02", "2026-10-03"]);
  });

  it("supports other layouts, e.g. year/day/type", async () => {
    const a = new CameraArchive(memorySource(["2026/2026-10-03/webp/20261003-000047.webp"]), {
      thumbnails: "{YYYY}/{YYYY}-{MM}-{DD}/webp/",
    });
    expect(await a.listDates()).toEqual(["2026-10-03"]);
    expect((await a.listFrames("2026-10-03")).map((f) => f.id)).toEqual(["20261003-000047"]);
  });

  it("groups preview, sidecar and RAW by stem", async () => {
    const a = new CameraArchive(memorySource(FILES));
    const frames = await a.listFrames("2026-10-03");
    expect(frames).toEqual([
      {
        id: "20261003-000047",
        t: Date.UTC(2026, 9, 3, 0, 0, 47),
        thumb: "thumbnails/2026/10/03/20261003-000047.webp",
        meta: "thumbnails/2026/10/03/20261003-000047.json",
        raw: "raw/2026/10/03/20261003-000047.dng",
        rawMeta: "raw/2026/10/03/20261003-000047.json",
      },
      { id: "20261003-000151", t: Date.UTC(2026, 9, 3, 0, 1, 51), thumb: "thumbnails/2026/10/03/20261003-000151.webp" },
      { id: "20261003-000300", t: Date.UTC(2026, 9, 3, 0, 3, 0), raw: "raw/2026/10/03/20261003-000300.dng" },
    ]);
  });
});

describe("helpers", () => {
  it("parses timestamps from names", () => {
    expect(timeFromName("20261003-193012_worker_kind")).toBe(Date.UTC(2026, 9, 3, 19, 30, 12));
    expect(timeFromName("index")).toBeUndefined();
  });

  it("matches template segments", () => {
    expect(segmentPattern("thumbnails")).toBeNull();
    expect(segmentPattern("{MM}")!.test("10")).toBe(true);
    expect(segmentPattern("{MM}")!.test("1x")).toBe(false);
  });

  it("finds the nearest frame", () => {
    const items = [{ t: 10 }, { t: 20 }, { t: 40 }];
    expect(nearestIndex(items, 0)).toBe(0);
    expect(nearestIndex(items, 29)).toBe(1);
    expect(nearestIndex(items, 31)).toBe(2);
    expect(nearestIndex(items, 99)).toBe(2);
  });

  it("filters by period and value range", () => {
    const frames = [{ id: "a", t: 1 }, { id: "b", t: 2 }, { id: "c", t: 3 }];
    const meta = new Map<string, Record<string, unknown>>([
      ["a", { exposure_us: 1e6, sky_state: { period: "night", sun_altitude_deg: -30 } }],
      ["b", { exposure_us: 1e3, sky_state: { period: "day", sun_altitude_deg: 20 } }],
    ]);
    expect(applyFilters(frames, meta, { periods: ["night"], rules: [], rawOnly: false }).map((f) => f.id)).toEqual(["a"]);
    expect(applyFilters(frames, meta, { periods: [], rules: [{ key: "exposure_s", min: 0.5 }], rawOnly: false }).map((f) => f.id)).toEqual(["a"]);
    expect(applyFilters(frames, meta, { periods: [], rules: [], rawOnly: false })).toHaveLength(3);
  });

  it("round-trips URL parameters", () => {
    const search = buildSearch({ type: "http-index", source: "https://d.org/cam 1/", date: "2026-10-03", time: "19:30" });
    expect(search).toBe("?type=http-index&source=https://d.org/cam%201/&date=2026-10-03&time=19:30");
    const p = readParams(search);
    expect(cameraFromParams(p)?.source).toEqual({ type: "http-index", url: "https://d.org/cam 1/" });
  });
});
