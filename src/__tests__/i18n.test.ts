import { afterEach, describe, expect, it } from "vitest";
import { ago, detectLang, setLang, t, tn } from "../lib/i18n";

describe("i18n", () => {
  afterEach(() => setLang("en"));

  it("takes ?lang= over the browser preference", () => {
    expect(detectLang("?lang=cs")).toBe("cs");
    expect(detectLang("?lang=xx")).not.toBe("xx");
  });

  it("fills variables and plural forms", () => {
    setLang("en");
    expect(t("viewer.fps", { n: 10 })).toBe("10 frames/s");
    expect(tn("frames", 1)).toBe("1 frame");
    expect(tn("frames", 5)).toBe("5 frames");
    setLang("cs");
    expect(tn("frames", 1)).toBe("1 snímek");
    expect(tn("frames", 3)).toBe("3 snímky");
    expect(tn("frames", 12)).toBe("12 snímků");
  });

  it("formats coarse ages in the current language", () => {
    const now = Date.parse("2026-10-22T12:00:00Z");
    setLang("en");
    expect(ago(now - 5 * 60_000, now)).toBe("5 minutes ago");
    expect(ago(now - 26 * 3_600_000, now)).toBe("yesterday");
    setLang("cs");
    expect(ago(now - 3 * 3_600_000, now)).toBe("před 3 hodinami");
    expect(ago(now - 26 * 3_600_000, now)).toBe("včera");
  });
});
