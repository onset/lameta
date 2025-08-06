import { describe, it, expect } from "vitest";
import { createPersonId, sanitizeForIri } from "../RoCrateUtils";

describe("RO-Crate IRI Validation", () => {
  it("should percent-encode spaces in sanitizeForIri function", () => {
    const input = "BAHOUNGOU Hilaire";
    const result = sanitizeForIri(input);
    
    expect(result).toBe("BAHOUNGOU%20Hilaire");
    expect(result).not.toContain(" ");
  });

  it("should create proper Person @id with spaces encoded", () => {
    const mockPerson = {
      filePrefix: "BAHOUNGOU Hilaire"
    };
    
    const personId = createPersonId(mockPerson);
    
    expect(personId).toBe("People/BAHOUNGOU%20Hilaire/");
    expect(personId).not.toContain(" ");
  });

  it("should handle special characters in Person IDs", () => {
    const mockPerson = {
      filePrefix: "BAKALA Michel (@Mfouati)"
    };
    
    const personId = createPersonId(mockPerson);
    
    expect(personId).toBe("People/BAKALA%20Michel%20%28@Mfouati%29/");
    expect(personId).not.toContain(" ");
    expect(personId).not.toContain("(");
    expect(personId).not.toContain(")");
  });
});
