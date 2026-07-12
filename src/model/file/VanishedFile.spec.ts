import * as fs from "fs-extra";
import * as Path from "path";
import * as temp from "temp";
import { describe, it, expect, vi, afterEach } from "vitest";
import { Session } from "../Project/Session/Session";
import { EncounteredVocabularyRegistry } from "../Project/EncounteredVocabularyRegistry";
import { PatientFS } from "../../other/patientFile";
import * as NotifyModule from "../../components/Notify";

// A session's folder can vanish from disk while the project is open: a
// collaborator deletes/renames it on another machine and a sync service
// (OneDrive/Dropbox) applies that locally, or someone removes it in Explorer.
// The in-memory File is now stale. Every save trigger (window blur, selection
// change, rename) used to re-attempt the write, hit ENOENT, and pop a fresh
// raw error toast -- spamming the user. These tests pin the soft-fail: save()
// must NOT throw, must warn at most once, must never emit the raw
// "(file.save)" NotifyError, and must leave the in-memory data intact.

function makeSavedSession(): { folder: string; session: Session } {
  const tmp = temp.mkdirSync("vanished-session");
  const folder = Path.join(tmp, "vic");
  fs.mkdirSync(folder);
  const session = Session.fromDirectory(
    folder,
    new EncounteredVocabularyRegistry()
  );
  session.properties.setText("id", "vic");
  session.saveAllFilesInFolder();
  return { folder, session };
}

describe("a session folder that vanished from disk", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("save() fails softly (no throw, no raw error toast, warns once) and keeps data", () => {
    const { folder, session } = makeSavedSession();
    const file = session.metadataFile!;
    expect(fs.existsSync(file.metadataFilePath)).toBe(true);

    // the folder disappears behind the app's back
    fs.removeSync(folder);
    expect(fs.existsSync(folder)).toBe(false);

    const warnSpy = vi
      .spyOn(NotifyModule, "NotifyWarning")
      .mockImplementation(() => {});
    const errorSpy = vi
      .spyOn(NotifyModule, "NotifyError")
      .mockImplementation(() => {});
    const accessSpy = vi
      .spyOn(NotifyModule, "NotifyFileAccessProblem")
      .mockImplementation(() => {});
    const writeSpy = vi.spyOn(PatientFS, "writeFileSyncWithNotifyThenRethrow");

    // make it dirty, then save many times, as repeated blur/selection would
    session.properties.setText("title", "edited after vanish");
    expect(() => {
      file.save();
      file.save();
      file.save();
    }).not.toThrow();

    // the raw "(file.save)" error path must NOT fire even once
    expect(errorSpy).not.toHaveBeenCalled();
    expect(accessSpy).not.toHaveBeenCalled();
    // exactly one gentle warning, regardless of how many saves were attempted
    expect(warnSpy).toHaveBeenCalledTimes(1);
    // and it should be worded as an external move/deletion, not a lameta bug
    expect(String(warnSpy.mock.calls[0][0]).toLowerCase()).toContain(
      "outside of lameta"
    );
    // no write was attempted, the folder is still gone, and the data survives
    expect(writeSpy).not.toHaveBeenCalled();
    expect(fs.existsSync(folder)).toBe(false);
    expect(file.fileMissing).toBe(true);
    expect(file.getTextProperty("title")).toBe("edited after vanish");
  });

  it("saveAllFilesInFolder() does not throw when the folder is gone", () => {
    const { folder, session } = makeSavedSession();
    fs.removeSync(folder);
    vi.spyOn(NotifyModule, "NotifyWarning").mockImplementation(() => {});
    expect(() => session.saveAllFilesInFolder()).not.toThrow();
  });

  it("resumes saving (and clears fileMissing) if the folder reappears", () => {
    const { folder, session } = makeSavedSession();
    const file = session.metadataFile!;
    fs.removeSync(folder);
    vi.spyOn(NotifyModule, "NotifyWarning").mockImplementation(() => {});

    session.properties.setText("title", "edited while gone");
    file.save();
    expect(file.fileMissing).toBe(true);

    // the sync service restores the folder
    fs.mkdirSync(folder, { recursive: true });
    session.properties.setText("title", "edited after return");
    file.save();

    expect(file.fileMissing).toBe(false);
    expect(fs.existsSync(file.metadataFilePath)).toBe(true);
    expect(fs.readFileSync(file.metadataFilePath, "utf8")).toContain(
      "edited after return"
    );
  });
});
