import { ProjectMetadataFile } from "../Project/Project";
import * as temp from "temp";
import fs from "fs";
import Path from "path";

let projectDirectory;
let projectName;

describe("Project Read", () => {
  beforeEach(async () => {
    projectDirectory = temp.mkdirSync("test");
    projectName = Path.basename(projectDirectory);
  });
  afterEach(async () => {
    temp.cleanupSync();
  });
  it("should read title", () => {
    const f = GetProjectFileWithOneField("Title", "This is the title.");
    expect(f.getTextProperty("title")).toBe("This is the title.");
  });
  it("empty date should just be empty string", () => {
    const f = GetProjectFileWithOneField("DateAvailable", "");
    expect(f.properties.getDateField("dateAvailable").asISODateString()).toBe(
      ""
    );
  });
  it("should read iso date properly", () => {
    const f = GetProjectFileWithOneField("DateAvailable", "2015-03-05");
    expect(f.properties.getDateField("dateAvailable").asISODateString()).toBe(
      "2015-03-05"
    );
  });
  it("should read iso date with time and offset properly", () => {
    const f = GetProjectFileWithOneField(
      "DateAvailable",
      "2016-01-01T00:00:00+02:00"
    );
    // The original says it's at midnight in a timezone 2 hours ahead of UTC.
    // In SayMore we don't want to deal with timezones, so we convert that to
    // UTC, which is actually the previous day, drop the time, drop the time offset.
    expect(f.properties.getDateField("dateAvailable").asISODateString()).toBe(
      "2015-12-31"
    );
  });
  it("should read vernacularISO3CodeAndName", () => {
    const f = GetProjectFileWithOneField(
      "VernacularISO3CodeAndName",
      "dde: Doondo"
    );
    expect(f.properties.getTextStringOrEmpty("vernacularIso3CodeAndName")).toBe(
      "dde: Doondo"
    );
  });
  it("should read AnalysisISO3CodeAndName", () => {
    const f = GetProjectFileWithOneField(
      "AnalysisISO3CodeAndName",
      "dde: Doondo"
    );
    expect(f.properties.getTextStringOrEmpty("analysisISO3CodeAndName")).toBe(
      "dde: Doondo"
    );
  });
  it("should read Doondo Project", () => {
    const doondoPath = "c:/dev/Doondo";
    if (fs.existsSync(doondoPath)) {
      const f = new ProjectMetadataFile(doondoPath);
      expect(f.properties.getDateField("dateAvailable").asISODateString()).toBe(
        "2015-03-05"
      );
      expect(f.properties.getTextStringOrEmpty("title")).toBe(
        "Doondo Language Documentation Corpus"
      );
      expect(f.properties.getTextStringOrEmpty("projectDescription")).toBe(
        "This corpus includes 7 hours of original audio recordings in Doondo."
      );
      expect(f.properties.getTextStringOrEmpty("accessProtocol")).toBe("REAP");
      expect(
        f.properties.getTextStringOrEmpty("vernacularIso3CodeAndName")
      ).toBe("dde: Doondo");
    }
  });
});

function GetProjectFileWithOneField(
  tag: string,
  content: string
): ProjectMetadataFile {
  fs.writeFileSync(
    Path.join(projectDirectory, projectName + ".sprj"),
    `<?xml version="1.0" encoding="utf-8"?>
  <Project><${tag}>${content}</${tag}></Project>`
  );
  return new ProjectMetadataFile(projectDirectory);
}
