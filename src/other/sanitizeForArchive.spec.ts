import { sanitizeForArchive } from "./sanitizeForArchive";
import { describe, it, expect } from "vite-plus/test";

describe("SanitizeForArchive", () => {
  it("in IMDI mode, it replaces ! with underscores", () => {
    const name = sanitizeForArchive("foo!bar!bas", "ASCII");
    expect(name).toBe("foo_bar_bas");
  });
  it("in IMDI mode, it doesn't leave trailing underscores", () => {
    const name = sanitizeForArchive("foo!", "ASCII");
    expect(name).toBe("foo");
  });
  it("gives a name in NFD the same result as the same name in NFC", () => {
    const nfc = "Café Zoë.wav";
    expect(sanitizeForArchive(nfc.normalize("NFD"), "ASCII")).toBe(
      sanitizeForArchive(nfc, "ASCII"),
    );
    expect(sanitizeForArchive(nfc.normalize("NFD"), "ASCII")).toBe("Cafe_Zoe.wav");
    expect(sanitizeForArchive(nfc.normalize("NFD"), "unicode")).toBe(nfc);
  });
  it.each(["ASCII", "unicode"] as const)(
    "with %s rules, keeps a name that Windows reserves for a device, changed so that Windows can use it",
    (rules) => {
      for (const name of ["COM1", "aux.txt", "CON.wav", "nul", "LPT1", "com1.mp3"]) {
        const result = sanitizeForArchive(name, rules);
        expect(result.length).toBeGreaterThan(0);
        expect(result).not.toMatch(/^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i);
        expect(result.toLowerCase().startsWith(name.split(".")[0].toLowerCase())).toBe(true);
        expect(sanitizeForArchive(result, rules)).toBe(result);
      }
    },
  );
  it.each(["ASCII", "unicode"] as const)(
    "with %s rules, does not end a name with a dot or a space",
    (rules) => {
      for (const name of ["Trailing dot.", "ends in space.wav ", "ends in dot."]) {
        expect(sanitizeForArchive(name, rules)).not.toMatch(/[. ]$/);
      }
    },
  );
});
