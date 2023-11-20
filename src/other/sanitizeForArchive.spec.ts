import { sanitizeForArchive } from "./sanitizeForArchive";
import { describe, it, expect } from "vitest";

describe("SanitizeForArchive", () => {
  it("in IMDI mode, it replaces ! with underscores", () => {
    const name = sanitizeForArchive("foo!bar!bas", true);
    expect(name).toBe("foo_bar_bas");
  });
  it("in IMDI mode, it doesn't leave trailing underscores", () => {
    const name = sanitizeForArchive("foo!", true);
    expect(name).toBe("foo");
  });
});
