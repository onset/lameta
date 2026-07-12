import fs from "fs";
import Path from "path";
import { Session } from "../Project/Session/Session";
import { EncounteredVocabularyRegistry } from "../Project/EncounteredVocabularyRegistry";
import temp from "temp";
import { describe, it, beforeEach, expect } from "vitest";

temp.track();

/*
  When the metadata file the model believes in (e.g. foo/foo.session) is
  missing but a file with the right extension and a different name exists
  (e.g. after an interrupted rename, or the user meddling in the file
  explorer), saveFolderMetaData() should rename that "zombie" to the expected
  name rather than writing a fresh expected file NEXT TO the zombie —
  otherwise the folder accumulates two .session files and, on the next load,
  which one wins is arbitrary.

  Historically the repair had two bugs that made it dead code: it only fired
  when there were TWO OR MORE zombies (`> 1`), and it passed a bare file name
  from readdirSync to renameSync, which can't resolve. These tests pin the
  fixed behavior.
*/
describe("zombie metadata repair at save time", () => {
  let rootDirectory: string;
  beforeEach(() => {
    rootDirectory = temp.mkdirSync("testZombieRepair");
  });

  it("saveFolderMetaData() renames a single misnamed metadata file instead of creating a second one", () => {
    const dir = Path.join(rootDirectory, "foo");
    fs.mkdirSync(dir);
    const session = Session.fromDirectory(
      dir,
      new EncounteredVocabularyRegistry()
    );
    session.properties.setText("id", "foo");
    session.saveFolderMetaData();
    expect(fs.existsSync(Path.join(dir, "foo.session"))).toBeTruthy();

    // someone/something renames the metadata file behind our back
    fs.renameSync(
      Path.join(dir, "foo.session"),
      Path.join(dir, "stale.session")
    );

    session.saveFolderMetaData();

    const sessionFiles = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".session"));
    expect(sessionFiles).toEqual(["foo.session"]);
  });

  it("saveFolderMetaData() still works when the metadata file is simply missing", () => {
    const dir = Path.join(rootDirectory, "bar");
    fs.mkdirSync(dir);
    const session = Session.fromDirectory(
      dir,
      new EncounteredVocabularyRegistry()
    );
    session.properties.setText("id", "bar");
    session.saveFolderMetaData();

    fs.rmSync(Path.join(dir, "bar.session"));
    session.saveFolderMetaData();

    const sessionFiles = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".session"));
    expect(sessionFiles).toEqual(["bar.session"]);
  });
});
