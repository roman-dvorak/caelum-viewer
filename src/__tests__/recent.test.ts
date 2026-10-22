import { beforeEach, describe, expect, it } from "vitest";
import { clearRecent, forgetSource, loadRecent, rememberCamera } from "../lib/recent";

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
});
