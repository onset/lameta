import { ProjectMetadataFile } from "../Project/Project";
import * as temp from "temp";
import fs from "fs";
import Path from "path";
import { EncounteredVocabularyRegistry } from "./EncounteredVocabularyRegistry";
import { describe, expect, it, beforeEach, afterEach } from "vitest";

let projectDirectory: string;
let projectName: string;

describe("Project Read", () => {
  beforeEach(() => {
    //const f:ProjectMetadataFile = GetProjectFileWithOneField("Title", "This is the title.");
    projectDirectory = temp.mkdirSync("test");
    projectName = Path.basename(projectDirectory);
  });
  afterEach(() => {
    temp.cleanupSync();
  });
  it("should read title", () => {
    const f = GetProjectFileWithOneField("Title", "This is the title.");
    expect(f.getTextProperty("title")).toBe("This is the title.");
  });

  // The original says it's at midnight in a timezone 2 hours ahead of UTC.
  // In SayMore we don't want to deal with timezones, so we convert that to
  // UTC, which is actually the previous day, drop the time, drop the time offset.

  it("should read collectionSubjectLanguages", () => {
    const f = GetProjectFileWithOneField(
      "CollectionSubjectLanguages",
      "dde: Doondo;etr: Edolo"
    );
    expect(
      f.properties.getTextStringOrEmpty("collectionSubjectLanguages")
    ).toBe("dde: Doondo;etr: Edolo");
  });

  // Before lameta 3, we could store a single language for the vernacular. If we
  // find a file using that but no modern collectionSubjectLanguage, collectionSubjectLanguage
  // should be loaded with the value from VernacularISO3CodeAndName.
  it("should load/migrate old VernacularISO3CodeAndName into collectionSubjectLanguage if missing or empty", () => {
    const f = GetProjectFileWithOneField(
      "VernacularISO3CodeAndName",
      "abc:Abracadabra"
    );
    expect(
      f.properties.getTextStringOrEmpty("collectionSubjectLanguages")
    ).toBe("abc:Abracadabra");
    // do same for AnaylsisISO3CodeAndName and collectionWorkingLanguages
    const f2 = GetProjectFileWithOneField(
      "AnalysisISO3CodeAndName",
      "xyz:Xabradabra"
    );
    expect(
      f2.properties.getTextStringOrEmpty("collectionWorkingLanguages")
    ).toBe("xyz:Xabradabra");
  });
  // REVIEW why? Why do we want to keep that old field around in memory?
  // it("fill legacy language fields from modern collectionLanguages", () => {
  //   const f = GetProjectFileWithOneField(
  //     "CollectionSubjectLanguages",
  //     "foo:FooBar;abc:Abracadabra"
  //   );
  //   expect(f.properties.getTextStringOrEmpty("vernacularIso3CodeAndName")).toBe(
  //     "foo:FooBar"
  //   );
  //   // do same for AnaylsisISO3CodeAndName and collectionWorkingLanguages
  //   const f2 = GetProjectFileWithOneField(
  //     "CollectionWorkingLanguages",
  //     "foo:FooBar;aby:Abracadabra"
  //   );
  //   expect(f2.properties.getTextStringOrEmpty("analysisIso3CodeAndName")).toBe(
  //     "foo:FooBar"
  //   );
  // });

  it("should read archiveConfigurationName", () => {
    const f = GetProjectFileWithOneField("ArchiveConfigurationName", "ELAR");
    expect(f.properties.getTextStringOrEmpty("archiveConfigurationName")).toBe(
      "ELAR"
    );
  });
  it("should read AccessProtocol into configurationName", () => {
    const f = GetProjectFileWithOneField("AccessProtocol", "ELAR");
    expect(f.properties.getTextStringOrEmpty("archiveConfigurationName")).toBe(
      "ELAR"
    );
  });
  it("archiveConfigurationName should be 'unknown' if missing configurationName & accessProtocol", () => {
    const f = GetProjectFileWithOneField("Foo", "bar");
    expect(f.properties.getTextStringOrEmpty("archiveConfigurationName")).toBe(
      "default"
    );
  });
  it("should read legacy AnalysisISO3CodeAndName into collectionWorkingLanguages", () => {
    const f = GetProjectFileWithOneField(
      "AnalysisISO3CodeAndName",
      "dde: Doondo"
    );
    expect(
      f.properties.getTextStringOrEmpty("collectionWorkingLanguages")
    ).toBe("dde: Doondo");
  });
  it("should read Doondo Project", () => {
    const doondoPath = "c:/dev/Doondo";
    if (fs.existsSync(doondoPath)) {
      const f = new ProjectMetadataFile(
        doondoPath,
        new EncounteredVocabularyRegistry()
      );

      expect(f.properties.getTextStringOrEmpty("title")).toBe(
        "Doondo Language Documentation Corpus"
      );
      expect(f.properties.getTextStringOrEmpty("projectDescription")).toBe(
        "This corpus includes 7 hours of original audio recordings in Doondo."
      );
      expect(
        f.properties.getTextStringOrEmpty("archiveConfigurationName")
      ).toBe("REAP");
      expect(
        f.properties.getTextStringOrEmpty("collectionSubjectLanguages")
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
  return new ProjectMetadataFile(
    projectDirectory,
    new EncounteredVocabularyRegistry()
  );
}
