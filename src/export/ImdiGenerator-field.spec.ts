import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { printResultXml, setResultXml } from "../other/xmlUnitTestUtils";
import * as XmlBuilder from "xmlbuilder";
import { fieldElement } from "./Imdi-static-fns.ts";
import { Field, FieldType } from "../model/field/Field.ts";
import { FieldDefinition } from "../model/field/FieldDefinition.ts";

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

describe("imdi multilingual field export", () => {
  it("exports LanguageId attribute even with just English", () => {
    const field = new Field("description", FieldType.Text, "a house");
    run((builder) => {
      fieldElement("description", field, builder);
    });
    expect("//description").toHaveAttributeValue("LanguageId", "en");
  });
  it("exports both English and Spanish", () => {
    const field = new Field("description", FieldType.Text, "a house");
    field.setTextAxis("es", "una casa");
    run((builder) => {
      fieldElement("description", field, builder);
    });
    expect("//description[@LanguageId]").toHaveCount(2);
    //printResultXml();
    expect("//description[@LanguageId='en']").toHaveText("a house");
    expect("//description[@LanguageId='es']").toHaveText("una casa");
  });
});

function run(fn: (builder: XmlBuilder.XMLElementOrXMLNode) => void) {
  const builder = XmlBuilder.create("Foo");
  fn(builder);
  setResultXml(builder.end({ pretty: true }));
}
