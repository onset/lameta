import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";
import * as fs from "fs-extra";
import * as path from "path";
import * as temp from "temp";
import { PersonMetadataFile } from "../../../model/Project/Person/Person";
import { EncounteredVocabularyRegistry } from "../../../model/Project/EncounteredVocabularyRegistry";
import { setupLanguageFinderForTests } from "../../../languageFinder/LanguageFinder";
import { FolderMetadataFile } from "../../../model/file/FolderMetaDataFile";

describe("birthYear casing read test", () => {
  let tempDir: string;

  beforeAll(() => {
    setupLanguageFinderForTests();
    // Ensure field definitions are loaded for tests
    FolderMetadataFile.loadDefaultConfigIfInUnitTest();
  });

  beforeEach(() => {
    tempDir = temp.mkdirSync("birthYear-casing-test");
  });

  afterEach(() => {
    temp.cleanupSync();
  });

  it("should read lowercase <birthYear> correctly", () => {
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

    const birthYear = personFile.getTextProperty("birthYear");
    console.log("Lowercase <birthYear> result:", birthYear);

    expect(birthYear).toBe("1972");
  });

  it("should read PascalCase <BirthYear> correctly", () => {
    const personId = path.basename(tempDir);
    const personXml = `<?xml version="1.0" encoding="utf-8"?>
<Person minimum_lameta_version_to_read="0.0.0">
  <FullName type="string">Ilawi Amosa</FullName>
  <BirthYear type="string">1960</BirthYear>
  <Gender type="string">Male</Gender>
</Person>`;

    fs.writeFileSync(path.join(tempDir, `${personId}.person`), personXml);

    const personFile = new PersonMetadataFile(
      tempDir,
      new EncounteredVocabularyRegistry()
    );

    const birthYear = personFile.getTextProperty("birthYear");
    console.log("PascalCase <BirthYear> result:", birthYear);

    expect(birthYear).toBe("1960");
  });

  it("should verify both casing styles result in same internal key", () => {
    // Test 1: lowercase
    const tempDir1 = temp.mkdirSync("test-lowercase");
    const personId1 = path.basename(tempDir1);
    fs.writeFileSync(
      path.join(tempDir1, `${personId1}.person`),
      `<?xml version="1.0" encoding="utf-8"?>
<Person><birthYear type="string">1972</birthYear></Person>`
    );
    const file1 = new PersonMetadataFile(
      tempDir1,
      new EncounteredVocabularyRegistry()
    );

    // Test 2: PascalCase
    const tempDir2 = temp.mkdirSync("test-pascal");
    const personId2 = path.basename(tempDir2);
    fs.writeFileSync(
      path.join(tempDir2, `${personId2}.person`),
      `<?xml version="1.0" encoding="utf-8"?>
<Person><BirthYear type="string">1960</BirthYear></Person>`
    );
    const file2 = new PersonMetadataFile(
      tempDir2,
      new EncounteredVocabularyRegistry()
    );

    console.log("=== ALL Property keys in file1 (lowercase <birthYear>) ===");
    file1.properties.forEach((key, field) => {
      console.log(`  Key: "${key}", value: "${field.text}"`);
    });

    console.log("=== ALL Property keys in file2 (PascalCase <BirthYear>) ===");
    file2.properties.forEach((key, field) => {
      console.log(`  Key: "${key}", value: "${field.text}"`);
    });

    // Both should return correct values using the same key
    expect(file1.getTextProperty("birthYear")).toBe("1972");
    expect(file2.getTextProperty("birthYear")).toBe("1960");
  });
});
