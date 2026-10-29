import { describe, it, expect } from "vitest";
import * as fs from "fs-extra";
import * as Path from "path";
import * as temp from "temp";
import { SessionMetadataFile } from "../Project/Session/Session";
import { EncounteredVocabularyRegistry } from "../Project/EncounteredVocabularyRegistry";

function writeSessionFile(contents: string): {
  tmpFolder: string;
  sessionFolder: string;
} {
  const tmpFolder = temp.mkdirSync();
  const sessionFolder = Path.join(tmpFolder, "test");
  fs.mkdirSync(sessionFolder);
  fs.writeFileSync(
    Path.join(sessionFolder, "test.session"),
    `<?xml version="1.0" encoding="utf-8"?>
  <Session>
    ${contents}
  </Session>`
  );
  return { tmpFolder, sessionFolder };
}

describe("fields whose names contain 'date'", () => {
  it("keeps the text of custom fields whose names contain 'date'", () => {
    const { tmpFolder, sessionFolder } = writeSessionFile(`
      <notes type="string">Original notes</notes>
      <CustomFields>
        <Validated_By type="string">Wilema Dimo</Validated_By>
        <transcription_date type="string">sometime in spring</transcription_date>
      </CustomFields>
    `);
    try {
      const f = new SessionMetadataFile(
        sessionFolder,
        new EncounteredVocabularyRegistry()
      );
      expect(f.getTextProperty("Validated_By")).toBe("Wilema Dimo");
      expect(f.getTextProperty("transcription_date")).toBe(
        "sometime in spring"
      );
      expect(f.getTextProperty("notes")).toBe("Original notes");
      expect(
        f.properties.getValueOrThrow("Validated_By").definition.isCustom
      ).toBe(true);

      const sessionFile = Path.join(sessionFolder, "test.session");
      const written = fs.readFileSync(sessionFile, "utf8");
      f.save(false, /*forceSave*/ true);
      expect(fs.readFileSync(sessionFile, "utf8")).not.toBe(written);
      const reloaded = new SessionMetadataFile(
        sessionFolder,
        new EncounteredVocabularyRegistry()
      );
      expect(reloaded.getTextProperty("Validated_By")).toBe("Wilema Dimo");
      expect(reloaded.getTextProperty("transcription_date")).toBe(
        "sometime in spring"
      );
    } finally {
      fs.removeSync(tmpFolder);
    }
  });

  it("can save a session that was given another session's custom field whose name contains 'date'", () => {
    const registry = new EncounteredVocabularyRegistry();
    const first = writeSessionFile(`
      <CustomFields>
        <Update type="string">second visit</Update>
      </CustomFields>
    `);
    const second = writeSessionFile(
      `<title type="string">another session</title>`
    );
    try {
      new SessionMetadataFile(first.sessionFolder, registry);
      const other = new SessionMetadataFile(second.sessionFolder, registry);
      // what the custom fields table does when it shows the other session
      registry
        .getChoices(
          other.type + EncounteredVocabularyRegistry.kCustomFieldSuffix
        )
        .forEach((key) => other.addTextProperty(key, "", true, true));
      other.setTextProperty("title", "changed");
      expect(() => other.getXml(true)).not.toThrow();
      expect(() => other.save()).not.toThrow();
    } finally {
      fs.removeSync(first.tmpFolder);
      fs.removeSync(second.tmpFolder);
    }
  });

  it("keeps the notes when the date can't be parsed, whichever comes first", () => {
    for (const contents of [
      `<notes type="string">Original notes</notes><date>05/06/2020</date>`,
      `<date>05/06/2020</date><notes type="string">Original notes</notes>`
    ]) {
      const { tmpFolder, sessionFolder } = writeSessionFile(contents);
      try {
        const f = new SessionMetadataFile(
          sessionFolder,
          new EncounteredVocabularyRegistry()
        );
        expect(f.getTextProperty("date")).toBe("");
        const notes = f.getTextProperty("notes");
        expect(notes).toContain("Original notes");
        expect(notes).toContain("05/06/2020");
      } finally {
        fs.removeSync(tmpFolder);
      }
    }
  });
});
