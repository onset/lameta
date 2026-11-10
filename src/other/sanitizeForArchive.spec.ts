import { sanitizeForArchive, sanitizeForExport } from "./sanitizeForArchive";
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
    // a Mac reports the name on disk in NFD, so a name for that disk must stay as it is
    expect(sanitizeForArchive(nfc.normalize("NFD"), "unicode")).toBe(nfc.normalize("NFD"));
  });
  it.each(["ASCII", "unicode"] as const)(
    "with %s rules, keeps a name that Windows reserves for a device, changed so that Windows can use it",
    (rules) => {
      for (const name of [
        "COM1",
        "aux.txt",
        "CON.wav",
        "nul",
        "LPT1",
        "com1.mp3",
        "CON ",
        "aux?",
      ]) {
        const result = sanitizeForArchive(name, rules);
        expect(result.length).toBeGreaterThan(0);
        expect(result).not.toMatch(/^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i);
        expect(result.toLowerCase().startsWith(name.match(/^[a-z]+\d?/i)![0].toLowerCase())).toBe(
          true,
        );
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
  it.each(["ASCII", "unicode"] as const)(
    "with %s rules, gives a name that it leaves unchanged when given it again",
    (rules) => {
      for (const name of ["abc .", "foo_?", "CON .", "x_ .", "Trailing dot."]) {
        const once = sanitizeForArchive(name, rules);
        expect(sanitizeForArchive(once, rules), name).toBe(once);
      }
    },
  );
});

describe("sanitizeForExport", () => {
  it("never gives an empty name, nor one that is only an extension", () => {
    for (const name of ["!!!", "???", "???.wav", "()"]) {
      const result = sanitizeForExport(name);
      expect(result.length, name).toBeGreaterThan(0);
      expect(result.startsWith("."), name).toBe(false);
      expect(sanitizeForArchive(result, "ASCII")).toBe(result);
    }
    expect(sanitizeForExport("???.wav").endsWith(".wav")).toBe(true);
  });
  it("gives different names to two names that have nothing usable in them", () => {
    expect(sanitizeForExport("!!!")).not.toBe(sanitizeForExport("???"));
  });
  it("leaves a name that is only an extension, when it had one", () => {
    expect(sanitizeForExport(".wav")).toBe(".wav");
  });
  it("gives the same names as sanitizeForArchive with ASCII rules otherwise", () => {
    expect(sanitizeForExport("Café Zoë.wav")).toBe("Cafe_Zoe.wav");
  });
});
