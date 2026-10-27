import { describe, expect, it } from "vitest";
import { timeSlots, typicalInterval } from "../lib/overview";

const at = (...s: number[]) => s.map((x) => ({ t: x * 1000 }));

describe("overview time slots", () => {
  it("takes the median gap as the interval", () => {
    expect(typicalInterval(at(0, 60, 120, 400))).toBe(60_000);
    expect(typicalInterval(at(5))).toBeUndefined();
  });

  it("collapses frames of unsynchronised cameras into common steps", () => {
    const a = at(0, 60, 120, 180);
    const b = at(10, 70, 130, 190);
    expect(timeSlots([a, b])).toEqual([0, 60, 120, 180].map((x) => x * 1000));
  });

  it("keeps every frame of a single camera and survives empty lists", () => {
    expect(timeSlots([at(0, 30, 60), []])).toEqual([0, 30_000, 60_000]);
    expect(timeSlots([[], []])).toEqual([]);
  });
});
