import { SessionMetadataFile } from "./Session";
import * as temp from "temp";
import fs from "fs";
import Path from "path";

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
  it("should addition fields", () => {
    const f = GetSessionFileWithOneField(
      "AdditionalFields",
      '<Location_Country type="string">Congo Republic of the</Location_Country>'
    );
    expect(f.getTextProperty("Location_Country")).toBe("Congo Republic of the");
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
