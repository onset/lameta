import { OtherFile } from "../model/file/File";
import { EncounteredVocabularyRegistry } from "../model/Project/EncounteredVocabularyRegistry";
import * as temp from "temp";
import * as fs from "fs";
import * as Path from "path";

// Track temporary files for cleanup
temp.track();

describe("Document Access", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = temp.mkdirSync("document-access-test");
  });

  afterEach(() => {
    temp.cleanupSync();
  });

  it("should have access field on OtherFile", () => {
    // Create a test file
    const testFilePath = Path.join(tempDir, "test.txt");
    fs.writeFileSync(testFilePath, "test content");

    const file = new OtherFile(
      testFilePath,
      new EncounteredVocabularyRegistry()
    );

    // Verify access field exists and is empty by default
    expect(file.properties.getHasValue("access")).toBe(true);
    expect(file.properties.getTextStringOrEmpty("access")).toBe("");
  });

  it("should have accessDescription field on OtherFile", () => {
    const testFilePath = Path.join(tempDir, "test.txt");
    fs.writeFileSync(testFilePath, "test content");

    const file = new OtherFile(
      testFilePath,
      new EncounteredVocabularyRegistry()
    );

    // Verify accessDescription field exists
    expect(file.properties.getHasValue("accessDescription")).toBe(true);
    expect(file.properties.getTextStringOrEmpty("accessDescription")).toBe("");
  });

  it("should persist access field value", () => {
    const testFilePath = Path.join(tempDir, "test.txt");
    fs.writeFileSync(testFilePath, "test content");

    const file = new OtherFile(
      testFilePath,
      new EncounteredVocabularyRegistry()
    );

    // Set access value
    file.properties.setText("access", "S");
    expect(file.properties.getTextStringOrEmpty("access")).toBe("S");

    // Save and reload
    file.save();

    const reloadedFile = new OtherFile(
      testFilePath,
      new EncounteredVocabularyRegistry()
    );

    expect(reloadedFile.properties.getTextStringOrEmpty("access")).toBe("S");
  });

  it("should persist accessDescription field value", () => {
    const testFilePath = Path.join(tempDir, "test.txt");
    fs.writeFileSync(testFilePath, "test content");

    const file = new OtherFile(
      testFilePath,
      new EncounteredVocabularyRegistry()
    );

    // Set access description value
    file.properties.setText("access", "S");
    file.properties.setText(
      "accessDescription",
      "Restricted for cultural reasons"
    );

    // Save and reload
    file.save();

    const reloadedFile = new OtherFile(
      testFilePath,
      new EncounteredVocabularyRegistry()
    );

    expect(
      reloadedFile.properties.getTextStringOrEmpty("accessDescription")
    ).toBe("Restricted for cultural reasons");
  });
});
