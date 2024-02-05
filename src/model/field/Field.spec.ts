import { expect, beforeEach, afterEach, describe, it } from "vitest";
import { Field, FieldType } from "./Field";

describe("Field.typeAndValueEscapedForXml Language Axis tests", () => {
  it("if there is only English, it should not write the language tag", () => {
    const f = new Field("title", FieldType.Text, "This is the title.");
    expect(f.typeAndValueEscapedForXml().value).toBe("This is the title.");
  });
  it("if there are no strings, it should just give an empty string", () => {
    const f = new Field("title", FieldType.Text);
    expect(f.typeAndValueEscapedForXml().value).toBe("");
  });
  it("if there is only Spanish, it should write the language tag", () => {
    const f = new Field("house", FieldType.Text, "[[es]]casa");
    expect(f.typeAndValueEscapedForXml().value).toBe("[[es]]casa");
  });
  it("should be correct when there is English and Spanish", () => {
    const f = new Field("house", FieldType.Text);
    f.setTextAxis("es", "casa");
    f.setTextAxis("en", "house");
    expect(f.typeAndValueEscapedForXml().value).toBe("[[es]]casa[[en]]house");
  });
});
