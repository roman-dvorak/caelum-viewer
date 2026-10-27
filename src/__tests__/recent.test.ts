import { beforeEach, describe, expect, it } from "vitest";
import { clearRecent, forgetSource, loadRecent, rememberCamera, togglePin } from "../lib/recent";

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

  it("records a catalog without a camera as its overview", () => {
    rememberCamera("Síť", undefined, { catalog: "https://x.org/c.json", date: "2026-10-01" });
    expect(loadRecent()[0]).toMatchObject({ label: "Síť", kind: "group", search: "?catalog=https://x.org/c.json" });
  });

  it("forgets and clears", () => {
    rememberCamera("A", undefined, { type: "caelum", source: "a" });
    rememberCamera("B", undefined, { type: "caelum", source: "b" });
    expect(forgetSource("?type=caelum&source=a").map((r) => r.label)).toEqual(["B"]);
    expect(clearRecent()).toEqual([]);
    expect(loadRecent()).toEqual([]);
  });

  it("keeps pinned entries on top, in place and through clearing", () => {
    for (const s of ["a", "b", "c"]) rememberCamera(s.toUpperCase(), undefined, { type: "caelum", source: s });
    togglePin("?type=caelum&source=a");
    togglePin("?type=caelum&source=c");
    expect(loadRecent().map((r) => r.label)).toEqual(["A", "C", "B"]);
    // Visiting a pinned camera doesn't reorder the pinned ones.
    rememberCamera("C", undefined, { type: "caelum", source: "c" });
    expect(loadRecent().map((r) => [r.label, !!r.pinned])).toEqual([["A", true], ["C", true], ["B", false]]);
    // Pinned entries are never pushed out by new ones.
    for (let i = 0; i < 12; i++) rememberCamera(`N${i}`, undefined, { type: "caelum", source: `n${i}` });
    expect(loadRecent().filter((r) => r.pinned).map((r) => r.label)).toEqual(["A", "C"]);
    expect(loadRecent()).toHaveLength(10);
    expect(clearRecent().map((r) => r.label)).toEqual(["A", "C"]);
    expect(togglePin("?type=caelum&source=a").map((r) => [r.label, !!r.pinned])).toEqual([["C", true], ["A", false]]);
  });
});
