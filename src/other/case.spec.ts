import { vi, describe, it, beforeAll, beforeEach, expect } from "vitest";
import { CapitalCase, safeSentenceCase } from "./case";

describe("CapitalCase tests", () => {
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

describe("safeSentenceCase tests", () => {
  it("capitalizes", () => {
    expect(safeSentenceCase("hello")).toBe("Hello");
    expect(safeSentenceCase("hello world")).toBe("Hello world");
    expect(safeSentenceCase("HELlo WoRld")).toBe("Hello world");
    // Not totally clear what the right answer would be here:
    expect(safeSentenceCase("")).toBe("");
  });
  it("does not capitalize some known mixed-case things", () => {
    expect(safeSentenceCase("FLEx")).toBe("FLEx");
    expect(safeSentenceCase("FLEx project")).toBe("FLEx project");
    expect(safeSentenceCase("the FLEx Project")).toBe("The FLEx project");
  });

  it("does not capitalize acronyms", () => {
    expect(safeSentenceCase("on AWS")).toBe("On AWS");
  });
});
