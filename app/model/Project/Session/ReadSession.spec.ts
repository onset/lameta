import { SessionMetadataFile } from "./Session";
import * as temp from "temp";
import fs from "fs";
import Path from "path";
import { Field } from "../../field/Field";

let sessionDirectory;
let sessionName;

describe("Session Read", () => {
  beforeEach(async () => {
    sessionDirectory = temp.mkdirSync("test");
    sessionName = Path.basename(sessionDirectory);
  });
  afterEach(async () => {
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
  it("should read addition fields", () => {
    const f = GetSessionFileWithOneField(
      "AdditionalFields",
      '<Location_Country type="string">Congo Republic of the</Location_Country>'
    );
    expect(f.getTextProperty("locationCountry")).toBe("Congo Republic of the");
    let x: Field = f.properties.getValueOrThrow("locationCountry");
    expect(x.definition.isAdditional).toBeTruthy();

    //After changing that value, it should still be an "additional" field.
    f.setTextProperty("locationCountry", "somewhere else");
    x = f.properties.getValueOrThrow("locationCountry");
    expect(x.definition.isAdditional).toBeTruthy();
  });
});

function GetSessionFileWithOneField(
  tag: string,
  content: string
): SessionMetadataFile {
  fs.writeFileSync(
    Path.join(sessionDirectory, sessionName + ".session"),
    `<?xml version="1.0" encoding="utf-8"?>
  <Session><${tag}>${content}</${tag}></Session>`
  );
  return new SessionMetadataFile(sessionDirectory);
}
