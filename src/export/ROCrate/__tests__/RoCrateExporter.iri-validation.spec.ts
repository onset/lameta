import { describe, it, expect } from "vitest";
import { createPersonId, sanitizeForIri } from "../RoCrateUtils";

describe("RO-Crate IRI Validation", () => {
  it("should percent-encode spaces in sanitizeForIri function", () => {
    const input = "BAHOUNGOU Hilaire";
    const result = sanitizeForIri(input);

    expect(result).toBe("BAHOUNGOU%20Hilaire");
    expect(result).not.toContain(" ");
  });

  it("should create proper Person @id fragments for names with spaces", () => {
    const mockPerson = {
      filePrefix: "BAHOUNGOU Hilaire"
    };

    const personId = createPersonId(mockPerson);

    // LAM-58 https://linear.app/lameta/issue/LAM-58/ro-crate-person-ids-use-name-fragments
    // enforces #Name fragments so Person IDs never leak filesystem paths again.
    expect(personId).toBe("#BAHOUNGOU_Hilaire");
    expect(personId.startsWith("#")).toBe(true);
    expect(personId).not.toContain(" ");
  });

  it("should handle special characters in Person IDs", () => {
    const mockPerson = {
      filePrefix: "BAKALA Michel (@Mfouati)"
    };

    const personId = createPersonId(mockPerson);

    expect(personId).toBe("#BAKALA_Michel___Mfouati_");
    expect(personId).not.toContain(" ");
    expect(personId).not.toContain("(");
    expect(personId).not.toContain(")");
  });
});
