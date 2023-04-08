import { vi, describe, it, beforeAll, beforeEach, expect } from "vitest";
import { CapitalCase } from "./case";

describe("case tests", () => {
  it("capitalizes", () => {
    expect(CapitalCase("hello")).toBe("Hello");
    expect(CapitalCase("hello world")).toBe("Hello World");
    expect(CapitalCase("HELlo WoRld")).toBe("Hello World");
    // Not totally clear what the right answer would be here:
    expect(CapitalCase(" hello world")).toBe(" Hello World");
    expect(CapitalCase("explicación")).toBe("Explicación");
    expect(CapitalCase("")).toBe("");
  });
});
