import { describe, it, expect } from "vitest";
import { createPersonId, sanitizeForIri } from "../RoCrateUtils";

describe("RO-Crate IRI Validation", () => {
  it("should convert spaces to underscores in sanitizeForIri function", () => {
    const input = "BAHOUNGOU Hilaire";
    const result = sanitizeForIri(input);

    expect(result).toBe("BAHOUNGOU_Hilaire");
    expect(result).not.toContain(" ");
  });

  it("should create proper Person @id fragments for names with spaces", () => {
    const mockPerson = {
      filePrefix: "BAHOUNGOU Hilaire"
    };

    const personId = createPersonId(mockPerson);

    // LAM-58 https://linear.app/lameta/issue/LAM-58/ro-crate-person-ids-use-name-fragments
    // Person IDs use underscores for spaces (IRI-safe)
    expect(personId).toBe("#BAHOUNGOU_Hilaire");
    expect(personId.startsWith("#")).toBe(true);
    expect(personId).not.toContain(" "); // Raw space should not appear
  });

  it("should encode parentheses but preserve @ in Person IDs", () => {
    const mockPerson = {
      filePrefix: "BAKALA Michel (@Mfouati)"
    };

    const personId = createPersonId(mockPerson);

    // Parentheses are encoded, @ is preserved (valid in IRIs)
    expect(personId).toBe("#BAKALA_Michel_%28@Mfouati%29");
    expect(personId).not.toContain(" "); // Raw space
    expect(personId).toContain("%28"); // Encoded (
    expect(personId).toContain("%29"); // Encoded )
    expect(personId).toContain("@"); // @ is preserved in IRIs
  });
});
