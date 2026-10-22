import { beforeEach, describe, expect, it } from "vitest";
import { ago, clearRecent, forgetSource, loadRecent, rememberCamera } from "../lib/recent";

describe("recent cameras", () => {
  beforeEach(() => localStorage.clear());

  it("keeps each camera once, newest first, without the view position", () => {
    rememberCamera("A", "Síť", { catalog: "https://x.org/c.json", camera: "a", date: "2026-10-01", time: "20:00" });
    rememberCamera("B", undefined, { type: "caelum", source: "192.168.1.50", live: "1" });
    rememberCamera("A", "Síť", { catalog: "https://x.org/c.json", camera: "a", date: "2026-10-02" });
    const list = loadRecent();
    expect(list.map((r) => r.label)).toEqual(["A", "B"]);
    expect(list[0].search).toBe("?catalog=https://x.org/c.json&camera=a");
    expect(list[0].kind).toBe("catalog");
    expect(list[1].search).toBe("?type=caelum&source=192.168.1.50");
  });

  it("forgets and clears", () => {
    rememberCamera("A", undefined, { type: "caelum", source: "a" });
    rememberCamera("B", undefined, { type: "caelum", source: "b" });
    expect(forgetSource("?type=caelum&source=a").map((r) => r.label)).toEqual(["B"]);
    expect(clearRecent()).toEqual([]);
    expect(loadRecent()).toEqual([]);
  });

  it("formats coarse ages", () => {
    const now = Date.parse("2026-10-22T12:00:00Z");
    expect(ago(now - 10_000, now)).toBe("právě teď");
    expect(ago(now - 5 * 60_000, now)).toBe("před 5 min");
    expect(ago(now - 3 * 3_600_000, now)).toBe("před 3 h");
    expect(ago(now - 26 * 3_600_000, now)).toBe("včera");
  });
});
