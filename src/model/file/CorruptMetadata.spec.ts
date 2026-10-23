import * as fs from "fs-extra";
import * as Path from "path";
import * as temp from "temp";
import { describe, it, expect, vi, afterEach } from "vite-plus/test";
import { OtherFile } from "./File";
import { Session, SessionMetadataFile } from "../Project/Session/Session";
import { EncounteredVocabularyRegistry } from "../Project/EncounteredVocabularyRegistry";
import { PatientFS } from "../../other/patientFile";
import * as NotifyModule from "../../components/Notify";

// A cloud sync (OneDrive, Dropbox, ...) that gets interrupted mid-write can
// leave a 0-byte or truncated .session/.person file on disk. lameta records
// why it could not read such a file and goes on loading, and a later save()
// must never overwrite the user's real (possibly still recoverable) bytes with
// an empty template.

function getPretendAudioFile(): string {
  const path = temp.path({ suffix: ".mp3" }) as string;
  fs.writeFileSync(path, "pretend contents");
  return path;
}

function makeSessionFolder(): {
  tmpFolder: string;
  sessionFolder: string;
  sessionFilePath: string;
} {
  const tmpFolder = temp.mkdirSync();
  const sessionFolder = Path.join(tmpFolder, "ETR009");
  fs.mkdirSync(sessionFolder);
  const sessionFilePath = Path.join(sessionFolder, "ETR009.session");
  return { tmpFolder, sessionFolder, sessionFilePath };
}

const validSessionXml = `<?xml version="1.0" encoding="utf-8"?>
<Session>
  <id type="string">ETR009</id>
  <title type="string">Test Session</title>
</Session>`;

describe("corrupt/truncated metadata files", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("records why it could not read a 0-byte .session file, and leaves the file untouched", () => {
    const { tmpFolder, sessionFolder, sessionFilePath } = makeSessionFolder();
    try {
      fs.writeFileSync(sessionFilePath, "");

      const f = new SessionMetadataFile(sessionFolder, new EncounteredVocabularyRegistry());
      f.save(/*beforeRename*/ false, /*forceSave*/ true);

      expect(f.metadataReadProblem).toBeTruthy();
      expect(fs.readFileSync(sessionFilePath, "utf8")).toBe("");
    } finally {
      fs.removeSync(tmpFolder);
    }
  });

  it("records why it could not read a truncated-XML .session file, and leaves the file untouched", () => {
    const { tmpFolder, sessionFolder, sessionFilePath } = makeSessionFolder();
    try {
      // First half of a valid file -- an interrupted cloud sync writes exactly
      // this kind of half-written file.
      const truncated = validSessionXml.slice(0, Math.floor(validSessionXml.length / 2));
      fs.writeFileSync(sessionFilePath, truncated);

      const f = new SessionMetadataFile(sessionFolder, new EncounteredVocabularyRegistry());
      f.save(/*beforeRename*/ false, /*forceSave*/ true);

      expect(f.metadataReadProblem).toBeTruthy();
      expect(fs.readFileSync(sessionFilePath, "utf8")).toBe(truncated);
    } finally {
      fs.removeSync(tmpFolder);
    }
  });

  it("loads the real session fine alongside a OneDrive/Dropbox '(conflicted copy)' sibling file", () => {
    const { tmpFolder, sessionFolder, sessionFilePath } = makeSessionFolder();
    try {
      fs.writeFileSync(sessionFilePath, validSessionXml);
      // What OneDrive/Dropbox create when the same file is edited from two
      // devices while offline and both changes later sync: a second copy
      // named after the sync engine's conflict convention, sitting right next
      // to the original.
      const conflictedCopyPath = Path.join(sessionFolder, "ETR009 (conflicted copy).session");
      fs.writeFileSync(conflictedCopyPath, validSessionXml);

      let threw = false;
      let session: Session | undefined;
      try {
        session = Session.fromDirectory(sessionFolder, new EncounteredVocabularyRegistry());
      } catch {
        threw = true;
      }

      expect(threw).toBe(false);
      // The real session still loads and reads correctly.
      expect(session!.metadataFile!.getTextProperty("title")).toBe("Test Session");

      // Documented current behavior: lameta has no special handling for a
      // sync engine's "(conflicted copy)" naming convention. Folder.loadChildFiles
      // only special-cases the folder's own metadata file (by exact path) and
      // skips ".meta"/".test" files -- everything else, including this sibling
      // ".session" file, is picked up as an ordinary attached OtherFile (with
      // its own auto-created ".meta" sidecar), just like any other
      // unrecognized document. It is NOT parsed as session metadata, merged,
      // or flagged to the user as a conflict.
      const conflictedAsOtherFile = session!.files.find(
        (f) => f.pathInFolderToLinkFileOrLocalCopy === conflictedCopyPath,
      );
      expect(conflictedAsOtherFile).toBeDefined();
    } finally {
      fs.removeSync(tmpFolder);
    }
  });

  it("records why it could not read an unparseable .meta file and refuses to save (even forced) over it", () => {
    const mediaFilePath = getPretendAudioFile();
    const metaFilePath = mediaFilePath + ".meta";
    // 0 bytes: exactly what an interrupted cloud sync leaves behind.
    fs.writeFileSync(metaFilePath, "");

    const notifySpy = vi.spyOn(NotifyModule, "NotifyException").mockImplementation(() => {
      /* swallow */
    });

    const f = new OtherFile(mediaFilePath, new EncounteredVocabularyRegistry());

    expect(f.metadataReadProblem).toBeTruthy();
    expect(notifySpy).not.toHaveBeenCalled();

    const writeSpy = vi.spyOn(PatientFS, "writeFileSyncWithNotifyThenRethrow");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
      /* swallow */
    });

    f.save(); // normal save
    f.save(/*beforeRename*/ false, /*forceSave*/ true); // forced save

    expect(writeSpy).not.toHaveBeenCalled();
    expect(fs.readFileSync(metaFilePath, "utf8")).toBe("");
    expect(warnSpy).toHaveBeenCalled();
  });
});
