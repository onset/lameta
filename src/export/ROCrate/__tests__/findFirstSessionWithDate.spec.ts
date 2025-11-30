import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs-extra";
import * as path from "path";
import * as temp from "temp";
import { PersonMetadataFile } from "../../../model/Project/Person/Person";
import { EncounteredVocabularyRegistry } from "../../../model/Project/EncounteredVocabularyRegistry";
import { setupLanguageFinderForTests } from "../../../languageFinder/LanguageFinder";
import { FolderMetadataFile } from "../../../model/file/FolderMetaDataFile";
import { findFirstSessionWithDate } from "../RoCrateExporter";
import {
  makeLdacCompliantPersonEntry,
  makeEntriesFromParticipant
} from "../RoCratePeople";

describe("findFirstSessionWithDate", () => {
  beforeAll(() => {
    setupLanguageFinderForTests();
    FolderMetadataFile.loadDefaultConfigIfInUnitTest();
  });

  it("should return undefined when project has no sessions", () => {
    const mockProject = {} as any;
    expect(findFirstSessionWithDate(mockProject)).toBeUndefined();
  });

  it("should return undefined when sessions array is empty", () => {
    const mockProject = {
      sessions: { items: [] }
    } as any;
    expect(findFirstSessionWithDate(mockProject)).toBeUndefined();
  });

  it("should skip sessions without dates and return first session with date", () => {
    const mockProject = {
      sessions: {
        items: [
          {
            metadataFile: {
              getTextProperty: (key: string) => (key === "date" ? "" : "")
            }
          },
          {
            metadataFile: {
              getTextProperty: (key: string) =>
                key === "date" ? "2010-06-06" : ""
            }
          },
          {
            metadataFile: {
              getTextProperty: (key: string) =>
                key === "date" ? "2015-01-01" : ""
            }
          }
        ]
      }
    } as any;

    const result = findFirstSessionWithDate(mockProject);
    expect(result).toBeDefined();
    expect(result?.toISOString().startsWith("2010-06-06")).toBe(true);
  });

  it("should skip sessions with invalid dates", () => {
    const mockProject = {
      sessions: {
        items: [
          {
            metadataFile: {
              getTextProperty: (key: string) =>
                key === "date" ? "not-a-date" : ""
            }
          },
          {
            metadataFile: {
              getTextProperty: (key: string) =>
                key === "date" ? "2020-03-15" : ""
            }
          }
        ]
      }
    } as any;

    const result = findFirstSessionWithDate(mockProject);
    expect(result).toBeDefined();
    expect(result?.toISOString().startsWith("2020-03-15")).toBe(true);
  });

  it("should return undefined when all sessions have no date", () => {
    const mockProject = {
      sessions: {
        items: [
          {
            metadataFile: {
              getTextProperty: (key: string) => ""
            }
          },
          {
            metadataFile: {
              getTextProperty: (key: string) => ""
            }
          }
        ]
      }
    } as any;

    expect(findFirstSessionWithDate(mockProject)).toBeUndefined();
  });
});

describe("Person age calculation with first dated session", () => {
  beforeAll(() => {
    setupLanguageFinderForTests();
    FolderMetadataFile.loadDefaultConfigIfInUnitTest();
  });

  it("should calculate age using first session with date, not first session overall", () => {
    // Create a person with birthYear
    const tempDir = temp.mkdirSync("person-age-test");
    const personId = path.basename(tempDir);
    const personXml = `<?xml version="1.0" encoding="utf-8"?>
<Person minimum_lameta_version_to_read="0.0.0">
  <name type="string">Awi Heole</name>
  <birthYear type="string">1972</birthYear>
  <gender type="string">Male</gender>
</Person>`;

    fs.writeFileSync(path.join(tempDir, `${personId}.person`), personXml);
    const personFile = new PersonMetadataFile(
      tempDir,
      new EncounteredVocabularyRegistry()
    );

    // Simulate a project where first session has no date, but second session does
    const mockProject = {
      sessions: {
        items: [
          {
            // ETR008-like session with no date
            metadataFile: {
              getTextProperty: (key: string, defaultValue?: string) =>
                key === "date" ? "" : defaultValue || ""
            }
          },
          {
            // ETR009-like session with date 2010-06-06
            metadataFile: {
              getTextProperty: (key: string, defaultValue?: string) =>
                key === "date" ? "2010-06-06" : defaultValue || ""
            }
          }
        ]
      }
    } as any;

    // Get the session date using our helper function
    const sessionDate = findFirstSessionWithDate(mockProject);
    expect(sessionDate).toBeDefined();
    expect(sessionDate?.toISOString().startsWith("2010-06-06")).toBe(true);

    // Create a mock person object
    const mockPerson = {
      metadataFile: personFile,
      knownFields: [],
      ageOn: (refDate: Date) => {
        return personFile.properties
          .getDateField("birthYear")
          .yearsSince(refDate);
      }
    } as any;

    // Apply LDAC compliance which should add ldac:age
    const personEntry: any = { "@type": "Person", name: "Awi Heole" };
    makeLdacCompliantPersonEntry(mockPerson, sessionDate, personEntry);

    // Verify age was calculated (1972 to 2010 = 38 years)
    expect(personEntry["ldac:age"]).toBe("38");

    temp.cleanupSync();
  });

  it("should not add age when no session has a date", () => {
    const tempDir = temp.mkdirSync("person-no-date-test");
    const personId = path.basename(tempDir);
    const personXml = `<?xml version="1.0" encoding="utf-8"?>
<Person minimum_lameta_version_to_read="0.0.0">
  <name type="string">Test Person</name>
  <birthYear type="string">1980</birthYear>
</Person>`;

    fs.writeFileSync(path.join(tempDir, `${personId}.person`), personXml);
    const personFile = new PersonMetadataFile(
      tempDir,
      new EncounteredVocabularyRegistry()
    );

    // Project with no dated sessions
    const mockProject = {
      sessions: {
        items: [
          {
            metadataFile: {
              getTextProperty: () => ""
            }
          }
        ]
      }
    } as any;

    const sessionDate = findFirstSessionWithDate(mockProject);
    expect(sessionDate).toBeUndefined();

    const mockPerson = {
      metadataFile: personFile,
      knownFields: [],
      ageOn: (refDate: Date) => {
        return personFile.properties
          .getDateField("birthYear")
          .yearsSince(refDate);
      }
    } as any;

    const personEntry: any = { "@type": "Person", name: "Test Person" };
    makeLdacCompliantPersonEntry(mockPerson, sessionDate, personEntry);

    // Age should not be added when no session date is available
    expect(personEntry["ldac:age"]).toBeUndefined();

    temp.cleanupSync();
  });
});
