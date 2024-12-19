import { vi, describe, it, beforeAll, beforeEach, expect } from "vitest";
import { capitalCase, sentenceCaseUnlessAcronym } from "./case";

describe("capitalCase tests", () => {
  it("capitalizes", () => {
    expect(capitalCase("hello")).toBe("Hello");
    expect(capitalCase("hello world")).toBe("Hello World");
    expect(capitalCase("HELlo WoRld")).toBe("Hello World");
    // Not totally clear what the right answer would be here:
    expect(capitalCase(" hello world")).toBe(" Hello World");
    expect(capitalCase("explicación")).toBe("Explicación");
    expect(capitalCase("")).toBe("");
  });
});

describe("safeSentenceCase tests", () => {
  it("capitalizes", () => {
    expect(sentenceCaseUnlessAcronym("hello")).toBe("Hello");
    expect(sentenceCaseUnlessAcronym("hello world")).toBe("Hello world");
    expect(sentenceCaseUnlessAcronym("HELlo WoRld")).toBe("Hello world");
    // Not totally clear what the right answer would be here:
    expect(sentenceCaseUnlessAcronym("")).toBe("");
  });
  it("does not capitalize some known mixed-case things", () => {
    expect(sentenceCaseUnlessAcronym("FLEx")).toBe("FLEx");
    expect(sentenceCaseUnlessAcronym("FLEx project")).toBe("FLEx project");
    expect(sentenceCaseUnlessAcronym("the FLEx Project")).toBe(
      "The FLEx project"
    );
  });

  it("does not capitalize acronyms", () => {
    expect(sentenceCaseUnlessAcronym("on AWS")).toBe("On AWS");
  });
});
