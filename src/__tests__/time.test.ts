import { describe, expect, it } from "vitest";
import { liveStaleness } from "../lib/time";

describe("liveStaleness", () => {
  const now = Date.parse("2026-10-25T12:00:00Z");
  const h = 3_600_000;

  it("is fresh within an hour", () => {
    expect(liveStaleness(now - 5 * 60_000, now)).toBeNull();
    expect(liveStaleness(now - h, now)).toBeNull();
  });

  it("warns past an hour and past a day", () => {
    expect(liveStaleness(now - h - 1000, now)).toBe("hour");
    expect(liveStaleness(now - 23 * h, now)).toBe("hour");
    expect(liveStaleness(now - 24 * h - 1000, now)).toBe("day");
  });
});
