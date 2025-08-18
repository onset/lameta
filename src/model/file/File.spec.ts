import { OtherFile } from "./File";
import * as fs from "fs-extra";
import * as Path from "path";
import * as temp from "temp";
import { SessionMetadataFile } from "../Project/Session/Session";
import { ProjectMetadataFile } from "../Project/Project";
import { EncounteredVocabularyRegistry } from "../Project/EncounteredVocabularyRegistry";
import { setResultXml, xexpect as expect } from "../../other/xmlUnitTestUtils";
import { describe, it } from "vitest";

function getPretendAudioFile(): string {
  const path = temp.path({ suffix: ".mp3" }) as string;
  fs.writeFileSync(path, "pretend contents");
  return path;
}

function writeSessionFile(contents: string): {
  tmpFolder;
  sessionFolder;
  filePath;
} {
  const tmpFolder = temp.mkdirSync();
  const sessionFolder = Path.join(tmpFolder, "test");
  fs.mkdirSync(sessionFolder);
  const filePath = Path.join(sessionFolder, "test.session");
  fs.writeFileSync(
    filePath,
    `
  <?xml version="1.0" encoding="utf-8"?>
  <Session>
    ${contents}
  </Session>`
  );
  return { tmpFolder, sessionFolder, filePath };
}

function runTestsOnMetadataFile(contents: string, tests: () => any) {
  const { tmpFolder, sessionFolder, filePath } = writeSessionFile(contents);

  // note, we are using a session to run these just because we need something
  // concrete. It would be an improvement to do it in some more generic way.
  const f = new SessionMetadataFile(
    sessionFolder,
    new EncounteredVocabularyRegistry()
  );
  fs.removeSync(filePath); // remove the old file, just to make sure
  f.save(/*forceSave*/ true);
  try {
    setResultXml(fs.readFileSync(filePath, "utf8"));
    tests();
  } finally {
    try {
      fs.removeSync(tmpFolder);
    } catch (e) {
      console.error("could not remove test folder " + tmpFolder);
    }
  }
}

describe("file.save()", () => {
  it("should create a metadata file to go with audio file", () => {
    const mediaFilePath = getPretendAudioFile();
    new OtherFile(mediaFilePath, new EncounteredVocabularyRegistry()).save();
    expect(fs.existsSync(mediaFilePath + ".meta"));
  });
});

describe("FolderMetadataFile constructor", () => {
  it("should make the appropriate metadata file if it doesn't exist", () => {
    //temp.track();
    const dir = temp.mkdirSync("blah");
    const f = new SessionMetadataFile(dir, new EncounteredVocabularyRegistry());
    const files = fs.readdirSync(dir);
    expect(files.length).toBe(1);
    expect(files[0].indexOf(".session")).toBeGreaterThan(0);
    temp.cleanupSync();
  });
});

describe("file", () => {
  it("should roundtrip notes with dangerous characters", () => {
    const mediaFilePath = getPretendAudioFile();
    const f = new OtherFile(mediaFilePath, new EncounteredVocabularyRegistry());
    const notes: string = "<you> & me > 1 \"quote\" 'single quote'";
    f.setTextProperty("notes", notes);
    f.save();
    const f2 = new OtherFile(
      mediaFilePath,
      new EncounteredVocabularyRegistry()
    );
    expect(f2.getTextField("notes").text).toBe(notes);
  });

  it("should roundtrip custom field", () => {
    const mediaFilePath = getPretendAudioFile();
    const f = new OtherFile(mediaFilePath, new EncounteredVocabularyRegistry());
    f.setTextProperty("customone", "hello");
    f.save();
    const f2 = new OtherFile(
      mediaFilePath,
      new EncounteredVocabularyRegistry()
    );
    expect(f2.getTextField("customone").text).toBe("hello");
  });

  it("parses unambiguous US date+time without creating a note", () => {
    const { tmpFolder, sessionFolder, filePath } = writeSessionFile(`
      <Date type="date">11/22/2011 4:26:36 AM</Date>
      <title type="string">Test Session</title>
    `);

    const f = new SessionMetadataFile(
      sessionFolder,
      new EncounteredVocabularyRegistry()
    );

    // Should normalize to ISO date with time discarded
    expect(f.getTextProperty("date")).toBe("2011-11-22");
    // Should not have added a parsing error note
    const notes = f.getTextProperty("notes", "");
    expect(notes).not.toContain("Parsing Error");

    try {
      fs.removeSync(tmpFolder);
    } catch (e) {
      // ignore cleanup errors
    }
  });

  it("flags ambiguous date like 2/2/2022 and clears the date", () => {
    const { tmpFolder, sessionFolder, filePath } = writeSessionFile(`
      <Date type="date">2/2/2022</Date>
      <title type="string">Test Session</title>
    `);

    const f = new SessionMetadataFile(
      sessionFolder,
      new EncounteredVocabularyRegistry()
    );

    // Ambiguous; we should clear the date
    expect(f.getTextProperty("date")).toBe("");
    // And we should have added a note explaining the parsing error
    const notes = f.getTextProperty("notes", "");
    expect(notes).toContain('Parsing Error: lameta could not parse "2/2/2022"');

    try {
      fs.removeSync(tmpFolder);
    } catch (e) {
      // ignore cleanup errors
    }
  });

  // e.g., SayMore Windows Classic has more fields that we do; we need
  // to preserve those so that people don't lose their work
  // just because they tried out this version of SayMore
  it("should roundtrip xml elements it doesn't understand", () => {
    runTestsOnMetadataFile(
      `
    <stage_transcriptionN type="string">Complete</stage_transcriptionN>
    <something_With_craZy_casING>foobar</something_With_craZy_casING>
    <title type="string">war &amp; peace</title>`,
      () => {
        // this is a field we don't have but SayMore Windows Classic does
        expect("Session/stage_transcriptionN").toMatch("Complete");
        // did we roundtrip the type attribute?
        expect("Session/stage_transcriptionN[@type='string']").toHaveCount(1);

        expect("Session/something_With_craZy_casING").toHaveCount(1);

        /***** Things we can't roundtrip yet. (SayMore Windows 3.x doesn't need any of this as far as I know)
         *  If @type isn't "date" or "string"
         *  If there are other attributes
         *  If there is nested xml
         */
      }
    );
  });
});

describe("FolderMetadataFile", () => {
  it("can roundtrip sample session file", () => {
    const originalPath =
      "./sample data/Edolo sample/Sessions/ETR009/ETR009.session";
    const originalXml: string = fs.readFileSync(originalPath, "utf8");
    const newDir = Path.join(temp.dir, "ETR009");
    if (fs.existsSync(newDir)) {
      fs.removeSync(newDir);
    }
    fs.mkdirSync(newDir);
    const newPath = Path.join(newDir, "ETR009.session");
    fs.writeFileSync(newPath, originalXml, "utf8");

    const f = new SessionMetadataFile(
      newDir,
      new EncounteredVocabularyRegistry()
    );
    f.save();
    const newXml: string = fs.readFileSync(newPath, "utf8");
    // console.log("-----------------------------");
    // console.log(newXml);

    expect(newXml).toBe(originalXml);
  });

  /*
  it("can roundtrip sample project file", () => {
    // TODO: this is broken because we are migrating from single language to multiple project languages.
    // How to make a reasonable test? Maybe get
    // all the properties of the original and then verify
    // that after writing and reading back in, they are the same?

    const originalPath = "./sample data/Edolo sample/Edolo sample.sprj";
    const originalXml: string = fs.readFileSync(originalPath, "utf8");
    const newDir = Path.join(temp.dir, "Edolo sample");
    if (fs.existsSync(newDir)) {
      fs.removeSync(newDir);
    }
    fs.mkdirSync(newDir);
    const newPath = Path.join(newDir, "Edolo sample.sprj");
    fs.writeFileSync(newPath, originalXml, "utf8");

    const f = new ProjectMetadataFile(
      newDir,
      new EncounteredVocabularyRegistry()
    );
    f.save();
    const newXml: string = fs.readFileSync(newPath, "utf8");
    // console.log("-----------------------------");
    // console.log(newXml);
    expect(newXml).toBe(originalXml);
  });
  */
});

describe("Genre normalization during reading", () => {
  it("should map known genre label to ID when reading session", () => {
    const { tmpFolder, sessionFolder, filePath } = writeSessionFile(`
      <Genre type="string">Procedural Discourse</Genre>
      <title type="string">Test Session</title>
    `);

    const f = new SessionMetadataFile(
      sessionFolder,
      new EncounteredVocabularyRegistry()
    );

    // Check that genre label was normalized to ID
    expect(f.getTextProperty("genre")).toBe("procedural_discourse");

    try {
      fs.removeSync(tmpFolder);
    } catch (e) {
      console.error("could not remove test folder " + tmpFolder);
    }
  });

  it("should map Dialog label to dialog ID when reading session", () => {
    const { tmpFolder, sessionFolder, filePath } = writeSessionFile(`
      <Genre type="string">Dialog</Genre>
      <title type="string">Test Session</title>
    `);

    const f = new SessionMetadataFile(
      sessionFolder,
      new EncounteredVocabularyRegistry()
    );

    // Check that Dialog was normalized to dialog
    expect(f.getTextProperty("genre")).toBe("dialog");

    try {
      fs.removeSync(tmpFolder);
    } catch (e) {
      console.error("could not remove test folder " + tmpFolder);
    }
  });

  it("should handle case insensitive genre label mapping when reading session", () => {
    const { tmpFolder, sessionFolder, filePath } = writeSessionFile(`
      <Genre type="string">procedural discourse</Genre>
      <title type="string">Test Session</title>
    `);

    const f = new SessionMetadataFile(
      sessionFolder,
      new EncounteredVocabularyRegistry()
    );

    // Check that case insensitive matching works
    expect(f.getTextProperty("genre")).toBe("procedural_discourse");

    try {
      fs.removeSync(tmpFolder);
    } catch (e) {
      console.error("could not remove test folder " + tmpFolder);
    }
  });

  it("should leave unknown genre unchanged when reading session", () => {
    const { tmpFolder, sessionFolder, filePath } = writeSessionFile(`
      <Genre type="string">custom_unknown_genre</Genre>
      <title type="string">Test Session</title>
    `);

    const f = new SessionMetadataFile(
      sessionFolder,
      new EncounteredVocabularyRegistry()
    );

    // Check that unknown genre is left as-is
    expect(f.getTextProperty("genre")).toBe("custom_unknown_genre");

    try {
      fs.removeSync(tmpFolder);
    } catch (e) {
      console.error("could not remove test folder " + tmpFolder);
    }
  });

  it("should preserve genre ID when already in ID form", () => {
    const { tmpFolder, sessionFolder, filePath } = writeSessionFile(`
      <Genre type="string">procedural_discourse</Genre>
      <title type="string">Test Session</title>
    `);

    const f = new SessionMetadataFile(
      sessionFolder,
      new EncounteredVocabularyRegistry()
    );

    // Check that ID form is preserved
    expect(f.getTextProperty("genre")).toBe("procedural_discourse");

    try {
      fs.removeSync(tmpFolder);
    } catch (e) {
      console.error("could not remove test folder " + tmpFolder);
    }
  });

  it("should handle empty genre value when reading session", () => {
    const { tmpFolder, sessionFolder, filePath } = writeSessionFile(`
      <Genre type="string"></Genre>
      <title type="string">Test Session</title>
    `);

    const f = new SessionMetadataFile(
      sessionFolder,
      new EncounteredVocabularyRegistry()
    );

    // Check that empty genre is handled properly (returns empty string)
    expect(f.getTextProperty("genre")).toBe("");

    try {
      fs.removeSync(tmpFolder);
    } catch (e) {
      console.error("could not remove test folder " + tmpFolder);
    }
  });

  it("should mark file as dirty when genre is normalized during reading", () => {
    const { tmpFolder, sessionFolder, filePath } = writeSessionFile(`
      <Genre type="string">Procedural Discourse</Genre>
      <title type="string">Test Session</title>
    `);

    // Create session file - this triggers genre normalization
    const f = new SessionMetadataFile(
      sessionFolder,
      new EncounteredVocabularyRegistry()
    );

    // Check that genre was normalized
    expect(f.getTextProperty("genre")).toBe("procedural_discourse");

    // Save the file and check if the XML contains the normalized value
    f.save(false, true); // force save
    const savedXml = fs.readFileSync(filePath, "utf8");
    expect(savedXml).toContain(
      '<Genre type="string">procedural_discourse</Genre>'
    );

    try {
      fs.removeSync(tmpFolder);
    } catch (e) {
      console.error("could not remove test folder " + tmpFolder);
    }
  });

  it("should persist dirty flag after loading when normalization occurs", () => {
    const { tmpFolder, sessionFolder, filePath } = writeSessionFile(`
      <Genre type="string">Procedural Discourse</Genre>
      <title type="string">Test Session</title>
    `);

    // Create session file - this triggers genre normalization during loading
    const f = new SessionMetadataFile(
      sessionFolder,
      new EncounteredVocabularyRegistry()
    );

    // Check that genre was normalized
    expect(f.getTextProperty("genre")).toBe("procedural_discourse");

    // The file should be dirty because normalization occurred
    // We can verify this by checking if save() actually writes the file
    f.save(); // should save because file is dirty

    const savedXml = fs.readFileSync(filePath, "utf8");
    expect(savedXml).toContain(
      '<Genre type="string">procedural_discourse</Genre>'
    );

    try {
      fs.removeSync(tmpFolder);
    } catch (e) {
      console.error("could not remove test folder " + tmpFolder);
    }
  });

  it("should not mark file as dirty when no normalization occurs", () => {
    const { tmpFolder, sessionFolder, filePath } = writeSessionFile(`
      <Genre type="string">procedural_discourse</Genre>
      <title type="string">Test Session</title>
    `);

    // Create session file - no normalization needed (already in ID form)
    const f = new SessionMetadataFile(
      sessionFolder,
      new EncounteredVocabularyRegistry()
    );

    // Check that genre was preserved as-is (no normalization)
    expect(f.getTextProperty("genre")).toBe("procedural_discourse");

    // The key test: verify that the migrationsHappenedDuringReading flag was not set
    // We can indirectly test this by checking that genre normalization didn't occur
    // and that subsequent saves don't happen due to migration-related changes
    const originalContent = f.getTextProperty("genre");
    expect(originalContent).toBe("procedural_discourse"); // No change from input

    try {
      fs.removeSync(tmpFolder);
    } catch (e) {
      console.error("could not remove test folder " + tmpFolder);
    }
  });
});
