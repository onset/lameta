import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { printResultXml, setResultXml } from "../other/xmlUnitTestUtils";
import * as XmlBuilder from "xmlbuilder";
import { fieldElement } from "./Imdi-static-fns.ts";
import { Field, FieldType } from "../model/field/Field.ts";
import { FieldDefinition } from "../model/field/FieldDefinition.ts";
import {
  getImdiConformantBirthDate,
  isTildeBirthYear,
  resetTildeBirthYearWarning
} from "./ImdiGenerator.ts";

describe("imdi monolingual field export", () => {
  it("exports default if element is required", () => {
    run((builder) => {
      fieldElement("floor-color", "", builder, builder, true, "grey");
    });
    expect("//floor-color").toHaveText("grey");
  });
  it("exports nothing if given an empty string an element is not required", () => {
    run((builder) => {
      fieldElement("floor-color", "", builder, builder, false);
    });
    expect("//floor-color").toHaveCount(0);
  });

  it("exports value of a simple string Field", () => {
    run((builder) => {
      fieldElement(
        "wallcolor",
        new Field("color", FieldType.Text, "yellow"),
        builder,
        builder
      );
    });
    expect("//wallcolor").toHaveText("yellow");
  });
  it("exports imdirange with attributes", () => {
    const field = new Field("unused", FieldType.Text, "Guatemala");
    field.definition = new FieldDefinition({
      key: "unused",
      englishLabel: "unused",
      persist: true,
      imdiRange: "http://www.mpi.nl/IMDI/Schema/Countries.xml"
    });

    run((builder) => {
      fieldElement("country", field, builder, builder);
    });
    expect("//country").toHaveText("Guatemala");
    expect("//country").toHaveAttributeValue(
      "Link",
      "http://www.mpi.nl/IMDI/Schema/Countries.xml"
    );
    expect("//country").toHaveAttributeValue("Type", "OpenVocabulary");
  });
});

describe("xmlElementIsRequired & default handling", () => {
  it("exports nothing if given an empty string an element is not required", () => {
    run((builder) => {
      fieldElement("floor-color", "", builder, builder, false);
    });
    expect("//floor-color").toHaveCount(0);
  });
  it("exports default if element is required but string is empty & default not supplied", () => {
    run((builder) => {
      fieldElement("floor-color", "", builder, builder, true);
    });
    expect("//floor-color").toHaveCount(1);
    expect("//floor-color").toHaveText("");
  });
  it("exports default if element is required but string is empty & default is supplied", () => {
    run((builder) => {
      fieldElement("floor-color", "", builder, builder, true, "grey");
    });
    expect("//floor-color").toHaveCount(1);
    expect("//floor-color").toHaveText("grey");
  });

  // i don't know if this makes sense... might as well nail down a behavior
  it("exports nothing if element is not required and string is empty & default is supplied", () => {
    run((builder) => {
      fieldElement("floor-color", "", builder, builder, false, "grey");
    });
    expect("//floor-color").toHaveCount(0);
  });
  it("exports a value if given a field that has a string value", () => {
    run((builder) => {
      fieldElement(
        "wallcolor",
        new Field("color", FieldType.Text, "yellow"),
        builder,
        builder,
        true
      );
    });
    printResultXml();
    expect("//wallcolor").toHaveText("yellow");
  });
});

describe("imdi multilingual field export", () => {
  /* No at the moment we are just using the presence of multiple languages to determine whether to use LanguageId attribute.
  it("exports LanguageId attribute even with just English", () => {
    const field = new Field("description", FieldType.Text, "a house");
    run((builder) => {
      fieldElement("description", field, builder);
    });
    expect("//description").toHaveAttributeValue("LanguageId", "ISO639-1:en");
  });
  */
  it("exports both English and language with 3 letter code", () => {
    const field = new Field("description", FieldType.Text, "a house");
    field.setTextAxis("etr", "house in edolo");
    run((builder) => {
      fieldElement("description", field, builder);
    });
    expect("//description[@LanguageId]").toHaveCount(2);
    //printResultXml();
    expect("//description[@LanguageId='ISO639-1:en']").toHaveText("a house");
    expect("//description[@LanguageId='ISO639-3:etr']").toHaveText(
      "house in edolo"
    );
  });
});

describe("imdi monolingual field export", () => {
  /* at the time of this writing, we haven't settled on which fields will be multilingual.
  IMDI 3.0 only allows multilingual "Description" field.
  We are just trusting the UI to only allow one language for monolingual fields. 
  If a field was multilingual in a another version (e.g. this version +1 and then we came back to this version),
  that's going to be a problem if we're only using the presence of multiple languages to determine whether to use LanguageId attribute,
  rather than, say, the field definition.
  */
  it("doesn't use LanguageId attribute if there is only one language", () => {
    const field = new Field("title", FieldType.Text, "a house");
    run((builder) => {
      fieldElement("title", field, builder);
    });
    expect("//title").toHaveText("a house");
    expect("//title[@LanguageId]").toNotExist();
  });
});

function run(fn: (builder: XmlBuilder.XMLElementOrXMLNode) => void) {
  const builder = XmlBuilder.create("Foo");
  fn(builder);
  setResultXml(builder.end({ pretty: true }));
}

describe("getImdiConformantBirthDate", () => {
  it("returns valid 4-digit year as-is", () => {
    expect(getImdiConformantBirthDate("1964")).toBe("1964");
    expect(getImdiConformantBirthDate("2023")).toBe("2023");
  });

  it("returns valid year-month as-is", () => {
    expect(getImdiConformantBirthDate("1964-06")).toBe("1964-06");
    expect(getImdiConformantBirthDate("2023-12")).toBe("2023-12");
  });

  it("returns valid full date as-is", () => {
    expect(getImdiConformantBirthDate("1964-06-15")).toBe("1964-06-15");
  });

  it("returns Unspecified and Unknown as-is", () => {
    expect(getImdiConformantBirthDate("Unspecified")).toBe("Unspecified");
    expect(getImdiConformantBirthDate("Unknown")).toBe("Unknown");
  });

  it("returns Unspecified for empty or whitespace", () => {
    expect(getImdiConformantBirthDate("")).toBe("Unspecified");
    expect(getImdiConformantBirthDate("   ")).toBe("Unspecified");
  });

  it("converts approximate dates with tilde prefix to range format", () => {
    expect(getImdiConformantBirthDate("~1964")).toBe("1963/1965");
    expect(getImdiConformantBirthDate("~1959")).toBe("1958/1960");
    expect(getImdiConformantBirthDate("~1934")).toBe("1933/1935");
  });

  it("strips other non-conformant values and returns Unspecified", () => {
    expect(getImdiConformantBirthDate("circa 1964")).toBe("Unspecified");
    expect(getImdiConformantBirthDate("about 1960")).toBe("Unspecified");
    expect(getImdiConformantBirthDate("1960s")).toBe("Unspecified");
    expect(getImdiConformantBirthDate("mid-1960s")).toBe("Unspecified");
  });

  it("trims whitespace from valid values", () => {
    expect(getImdiConformantBirthDate("  1964  ")).toBe("1964");
    expect(getImdiConformantBirthDate("  Unspecified  ")).toBe("Unspecified");
  });

  it("handles tilde with whitespace", () => {
    expect(getImdiConformantBirthDate("  ~1964  ")).toBe("1963/1965");
  });
});

describe("isTildeBirthYear", () => {
  it("returns true for valid tilde birth years", () => {
    expect(isTildeBirthYear("~1964")).toBe(true);
    expect(isTildeBirthYear("~1933")).toBe(true);
    expect(isTildeBirthYear("~2000")).toBe(true);
    expect(isTildeBirthYear("  ~1964  ")).toBe(true);
  });

  it("returns false for non-tilde values", () => {
    expect(isTildeBirthYear("1964")).toBe(false);
    expect(isTildeBirthYear("")).toBe(false);
    expect(isTildeBirthYear("?")).toBe(false);
    expect(isTildeBirthYear("circa 1964")).toBe(false);
    expect(isTildeBirthYear("~")).toBe(false);
    expect(isTildeBirthYear("~abc")).toBe(false);
    expect(isTildeBirthYear("1956x")).toBe(false);
  });
});
