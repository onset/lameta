import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SessionMetadataFile } from "./Session";
import * as temp from "temp";
import fs from "fs";
import Path from "path";
import { Field } from "../../field/Field";
import { EncounteredVocabularyRegistry } from "../EncounteredVocabularyRegistry";

let sessionDirectory;
let sessionName;

describe("Session Read", () => {
  beforeEach(() => {
    sessionDirectory = temp.mkdirSync("test");
    sessionName = Path.basename(sessionDirectory);
  });
  afterEach(() => {
    temp.cleanupSync();
  });
  it("should read title", () => {
    const f = GetSessionFileWithOneField("title", "This is the title.");
    expect(f.getTextProperty("title")).toBe("This is the title.");
  });
  it("should read date", () => {
    const f = GetSessionFileWithOneField("date", "2013-01-08");
    expect(f.properties.getDateField("date").asISODateString()).toBe(
      "2013-01-08"
    );
  });

  // Working with old data files, I found that some version of saymore had created this: <date type="string">11/22/2011 4:26:36 AM</date>
  it("should register error about ambiguous dates", () => {
    // This version of SayMore does not write ambiguous, but we guard against any old data that may have them
    // by making a persistent note about the unparseable original and setting to blank.

    let f = GetSessionFileWithOneField("date", "11/23/2011 4:26:36 AM");
    expect(f.properties.getDateField("date").asISODateString()).toBe("");
    expect(
      f.properties.getTextStringOrEmpty("notes").indexOf("Error")
    ).toBeGreaterThan(-1);

    f = GetSessionFileWithOneField("date", "24/11/2011 4:26:36 AM");
    expect(f.properties.getDateField("date").asISODateString()).toBe("");
    expect(
      f.properties.getTextStringOrEmpty("notes").indexOf("Error")
    ).toBeGreaterThan(-1);

    f = GetSessionFileWithOneField("date", "25/11/2011");
    expect(f.properties.getDateField("date").asISODateString()).toBe("");
    expect(
      f.properties.getTextStringOrEmpty("notes").indexOf("Error")
    ).toBeGreaterThan(-1);

    f = GetSessionFileWithOneField("date", "11/25/2011");
    expect(f.properties.getDateField("date").asISODateString()).toBe("");
    expect(
      f.properties.getTextStringOrEmpty("notes").indexOf("Error")
    ).toBeGreaterThan(-1);
  });

  it("should handle a format seen for modified-date", () => {
    // We shouldn't be trying to understand these dates... I don't know why SayMore Classic even saved them,
    // but they are in some legacy data so I wanted to nail down that we could handle them by stripping off the time.
    const f = GetSessionFileWithOneField("date", "2013-01-08T09:34:32.000Z");
    expect(f.properties.getDateField("date").asISODateString()).toBe(
      "2013-01-08"
    );
  });

  it("should read in a single language", () => {
    const f = GetSessionFileWithOneField("languages", "fra", "languageChoices");
    expect(f.properties.getTextStringOrEmpty("languages")).toBe("fra");
  });

  it("should read in a multiple languages", () => {
    const f = GetSessionFileWithOneField(
      "languages",
      "fra;spa",
      "languageChoices"
    );
    expect(f.properties.getTextStringOrEmpty("languages")).toBe("fra;spa");
  });

  // in many cases, the key used internally to this version of SayMore
  // does not match the element name. This is especially true in the
  // AdditionalFields area. Here, the xml tag is Location_Country, but our
  // key is locationCountry:
  it("should read additional fields and convert name", () => {
    const f = GetSessionFileWithOneField(
      "AdditionalFields",
      '<Location_Country type="string">Colombia</Location_Country>'
    );
    expect(f.getTextProperty("locationCountry")).toBe("Colombia");
    let x: Field = f.properties.getValueOrThrow("locationCountry");
    expect(x.definition.isAdditional).toBeTruthy();

    //After changing that value, it should still be an "additional" field.
    f.setTextProperty("locationCountry", "Bulgaria");
    x = f.properties.getValueOrThrow("locationCountry");
    expect(x.definition.isAdditional).toBeTruthy();
  });

  it("should read choices that vary by case", () => {
    const f = GetSessionFileWithOneField(
      "AdditionalFields",
      '<Planning_Type type="string">pLAnNed</Planning_Type>'
    );
    expect(f.getTextProperty("planningType")).toBe("planned");
  });
});

function GetSessionFileWithOneField(
  tag: string,
  content: string,
  type?: string
): SessionMetadataFile {
  const typeText = type ? `type="${type}"` : "";
  fs.writeFileSync(
    Path.join(sessionDirectory, sessionName + ".session"),
    `<?xml version="1.0" encoding="utf-8"?>
  <Session><${tag} ${typeText}>${content}</${tag}></Session>`
  );
  return new SessionMetadataFile(
    sessionDirectory,
    new EncounteredVocabularyRegistry()
  );
}
