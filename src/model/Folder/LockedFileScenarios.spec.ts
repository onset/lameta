import fs from "fs";
import Path from "path";
import { Session } from "../Project/Session/Session";
import { EncounteredVocabularyRegistry } from "../Project/EncounteredVocabularyRegistry";
import { PatientFS } from "../../other/patientFile";
import temp from "temp";
import { describe, it, beforeEach, expect, afterEach, vi } from "vitest";

temp.track();
describe("Duplicate Folder", () => {
  let rootDirectory;
  beforeEach(async () => {
    rootDirectory = temp.mkdirSync("testDuplicateFolder");
  });
  afterEach(async () => {
    //temp.cleanupSync(); sometimes cause test to fail
  });

  it("nameMightHaveChanged() should rename the folder and its files", () => {
    const originalDir = Path.join(rootDirectory, "foo");
    fs.mkdirSync(originalDir);
    fs.writeFileSync(Path.join(originalDir, "aFile.txt"), "hello");
    fs.writeFileSync(Path.join(originalDir, "foo_someMedia.txt"), "hello");

    const original = Session.fromDirectory(
      originalDir,
      new EncounteredVocabularyRegistry()
    );
    original.properties.setText("id", "foo");
    original.saveFolderMetaData();
    expect(original.metadataFile?.metadataFilePath).toBeTruthy();
    expect(fs.existsSync(original.metadataFile!.metadataFilePath)).toBeTruthy();

    // now change the name and let the system rename the folder
    original.properties.setText("id", "bar");
    expect(original.nameMightHaveChanged()).toBeTruthy();

    // verify that the folder and its files have been renamed
    const renamedDir = Path.join(rootDirectory, "bar");
    expect(fs.existsSync(originalDir)).toBeFalsy();
    expect(fs.existsSync(Path.join(renamedDir, "aFile.txt"))).toBeTruthy();
    expect(
      fs.existsSync(Path.join(renamedDir, "bar_someMedia.txt"))
    ).toBeTruthy();
    expect(fs.existsSync(Path.join(renamedDir, "bar.session"))).toBeTruthy();
    expect(fs.existsSync(Path.join(renamedDir, "foo.session"))).toBeFalsy();
  });

  it("fromDirectory: if session is misnamed, deal with it", () => {
    const originalDir = Path.join(rootDirectory, "foo");
    fs.mkdirSync(originalDir);
    fs.writeFileSync(Path.join(originalDir, "foo_someMedia.txt"), "hello");

    const original = Session.fromDirectory(
      originalDir,
      new EncounteredVocabularyRegistry()
    );
    // we start with the norma ..../foo/foo.session
    expect(original.metadataFile?.metadataFilePath).toBeTruthy();
    expect(fs.existsSync(original.metadataFile!.metadataFilePath)).toBeTruthy();
    const changedDir = Path.join(rootDirectory, "bar");
    fs.renameSync(originalDir, changedDir);

    // now we have the problematic .../bar/foo.session we want to test
    expect(fs.existsSync(Path.join(changedDir, "foo.session"))).toBeTruthy();
    const reloadedFolder = Session.fromDirectory(
      changedDir,
      new EncounteredVocabularyRegistry()
    );

    // prior to lameta 2.3.2, we would now have both bar/foo.session and bar/bar.session,
    // and bar/foo_someMedia.txt

    // there are lots of different ways we could handle this:
    // 1. rename the foo.session to bar.session
    // 2. rename the folder to foo
    // 3. look inside of foo.session, get the id, and rename whichever ones are wrong
    // And of top of all that, we could look for things like foo_someMedi.txt and rename them to bar_someMedia.txt

    // The loading code should try to rename to match the folder name
    expect(fs.existsSync(Path.join(changedDir, "bar.session"))).toBeTruthy();

    // and use the id that is inside of that session. Note it's not clear if that's best but
    // it was a toss up and this didn't require changing any existing logic.
    expect(reloadedFolder.properties.getTextStringOrEmpty("id")).toBe("bar");

    // now if we change the id and let the system rename the folder, it should also rename the session
    // and any files that have the old name in them
    reloadedFolder.properties.setText("id", "baz");
    expect(reloadedFolder.nameMightHaveChanged()).toBeTruthy();
    const renamedDir = Path.join(rootDirectory, "baz");
    expect(fs.existsSync(changedDir)).toBeFalsy();
    expect(fs.existsSync(renamedDir)).toBeTruthy();
    expect(fs.existsSync(Path.join(renamedDir, "baz.session"))).toBeTruthy();

    // Not yet implemented
    // expect(
    //   fs.existsSync(Path.join(renamedDir, "baz_someMedia.txt"))
    // ).toBeTruthy();
  });

  it("nameMightHaveChanged(): if a random media file in a folder is locked, do not rename the folder or anything else", () => {
    const originalDir = Path.join(rootDirectory, "foo");
    fs.mkdirSync(originalDir);
    const original = Session.fromDirectory(
      originalDir,
      new EncounteredVocabularyRegistry()
    );
    fs.writeFileSync(Path.join(originalDir, "lock.me"), "hello");

    // we start with the normal ..../foo/foo.session
    expect(original.metadataFile?.metadataFilePath).toBeTruthy();
    expect(fs.existsSync(original.metadataFile!.metadataFilePath)).toBeTruthy();

    // NOTE: We're just locking ahead of time, and
    // that is a limited simulation of what we're trying to deal with.
    // We don't have a way of simulating something getting locked mid-way through a rename.
    // open one of the files so that the rename fails
    fs.openSync(Path.join(originalDir, "lock.me"), "r");
    original.properties.setText("id", "baz");
    // that lock should prevent the rename
    expect(original.nameMightHaveChanged()).toBeFalsy();
    const renamedDir = Path.join(rootDirectory, "baz");
    expect(fs.existsSync(originalDir)).toBeTruthy();
    expect(fs.existsSync(renamedDir)).toBeFalsy();
    expect(fs.existsSync(Path.join(originalDir, "foo.session"))).toBeTruthy();
    expect(fs.existsSync(Path.join(originalDir, "baz.session"))).toBeFalsy();
  });
  // Simulates something grabbing a handle mid-way through a rename: the
  // per-file renames succeed, then the rename of the folder itself fails.
  // Before the rollback was added, this stranded a folder with the OLD name
  // full of files carrying the NEW name (and on the next load the .session
  // got "repaired" back to the folder name, silently reverting the user's
  // rename). We simulate the lock by making PatientFS fail only the directory
  // rename, which is deterministic and doesn't spend ~10s in the retry loop
  // the way a real lock does; the opt-in RenameContention.stress.spec.ts
  // covers the same window with real locks.
  it("nameMightHaveChanged(): if the final folder rename fails, file renames are rolled back", () => {
    const originalDir = Path.join(rootDirectory, "foo");
    fs.mkdirSync(originalDir);
    fs.writeFileSync(Path.join(originalDir, "foo_someMedia.txt"), "hello");
    fs.writeFileSync(Path.join(originalDir, "unrelated.txt"), "hello");

    const original = Session.fromDirectory(
      originalDir,
      new EncounteredVocabularyRegistry()
    );
    original.properties.setText("id", "foo");
    original.saveFolderMetaData();
    original.saveAllFilesInFolder(false);
    const filesBefore = fs.readdirSync(originalDir).sort();

    const newDir = Path.join(rootDirectory, "baz");
    const realRenameSync = PatientFS.renameSync.bind(PatientFS);
    const spy = vi
      .spyOn(PatientFS, "renameSync")
      .mockImplementation((from: string, to: string) => {
        if (from === originalDir && to === newDir) {
          const err: NodeJS.ErrnoException = new Error(
            "simulated lock landed after the files were renamed"
          );
          err.code = "EPERM";
          throw err;
        }
        return realRenameSync(from, to);
      });
    try {
      original.properties.setText("id", "baz");
      expect(original.nameMightHaveChanged()).toBeFalsy();
    } finally {
      spy.mockRestore();
    }

    // the folder must still be fully in its OLD state: old name, old file names
    expect(fs.existsSync(originalDir)).toBeTruthy();
    expect(fs.existsSync(newDir)).toBeFalsy();
    expect(fs.readdirSync(originalDir).sort()).toEqual(filesBefore);
    // and the in-memory model must agree with the disk
    expect(fs.existsSync(original.metadataFile!.metadataFilePath)).toBeTruthy();
    expect(original.metadataFile!.metadataFilePath).toBe(
      Path.join(originalDir, "foo.session")
    );

    // having recovered, a later rename (lock gone) must succeed completely
    expect(original.nameMightHaveChanged()).toBeTruthy();
    expect(fs.existsSync(newDir)).toBeTruthy();
    expect(fs.existsSync(originalDir)).toBeFalsy();
    expect(fs.existsSync(Path.join(newDir, "baz.session"))).toBeTruthy();
    expect(fs.existsSync(Path.join(newDir, "baz_someMedia.txt"))).toBeTruthy();
    expect(fs.existsSync(Path.join(newDir, "unrelated.txt"))).toBeTruthy();
    expect(
      fs.readdirSync(newDir).filter((f) => f.startsWith("foo"))
    ).toEqual([]);
  });

  // TODO: test when a folder already has two sessions? We could pick the bigger one?
});
