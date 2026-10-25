import { describe, expect, it } from "vitest";
import { exportName } from "../lib/exporter";

describe("exportName", () => {
  const frames = [
    { id: "a", t: Date.UTC(2026, 9, 24, 11, 0, 0) },
    { id: "b", t: Date.UTC(2026, 9, 24, 12, 30, 5) },
  ];

  it("names the file by camera, date and time span", () => {
    expect(exportName("Ondřejov 1", frames)).toBe("Ondrejov-1_2026-10-24_110000-123005");
  });

  it("falls back when the name has nothing usable", () => {
    expect(exportName("★★", frames.slice(0, 1))).toBe("camera_2026-10-24_110000-110000");
  });
});
