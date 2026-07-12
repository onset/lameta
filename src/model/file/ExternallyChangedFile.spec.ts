import * as fs from "fs-extra";
import * as Path from "path";
import * as temp from "temp";
import { describe, it, expect, vi, afterEach } from "vitest";
import { Session } from "../Project/Session/Session";
import { EncounteredVocabularyRegistry } from "../Project/EncounteredVocabularyRegistry";
import * as NotifyModule from "../../components/Notify";

// When two people share a project via a cloud-sync service (OneDrive/Dropbox),
// user A's edit to a session syncs down onto user B's disk while B's lameta
// still holds that session in memory. lameta never re-reads metadata after
// load, so when B next saves that session, B's whole stale XML used to
// overwrite the file -- silently reverting A's edit with no trace anywhere.
//
// The fix: at the write choke point (File.save), if the metadata file on disk
// no longer matches what lameta last read/wrote, move that on-disk version
// aside to a sibling before writing ours, and warn once. These tests pin that
// "never silently clobber" behavior, plus the no-false-positive guard for
// mere mtime churn (a sync engine rewriting byte-identical content).

function makeSavedSession(): {
  folder: string;
  session: Session;
  sessionFilePath: string;
} {
  const tmp = temp.mkdirSync("externally-changed-session");
  const folder = Path.join(tmp, "ETR009");
  fs.mkdirSync(folder);
  const session = Session.fromDirectory(
    folder,
    new EncounteredVocabularyRegistry()
  );
  session.properties.setText("id", "ETR009");
  session.saveAllFilesInFolder();
  const sessionFilePath = session.metadataFile!.metadataFilePath;
  expect(fs.existsSync(sessionFilePath)).toBe(true);
  return { folder, session, sessionFilePath };
}

function setAsideSiblings(folder: string): string[] {
  return fs
    .readdirSync(folder)
    .filter((f) => f.includes("changed on another computer"));
}

// Rewrite the file with different content AND a distinctly different mtime, as
// a sync service delivering another machine's edit would.
function externallyReplace(path: string, contents: string) {
  fs.writeFileSync(path, contents);
  const future = new Date(Date.now() + 60_000);
  fs.utimesSync(path, future, future);
}

describe("a metadata file changed on disk underneath lameta", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("moves the external version aside, writes ours, warns exactly once, and does not re-trigger on the next save", () => {
    const { folder, session, sessionFilePath } = makeSavedSession();
    const file = session.metadataFile!;

    const warnSpy = vi
      .spyOn(NotifyModule, "NotifyWarning")
      .mockImplementation(() => {});
    const errorSpy = vi
      .spyOn(NotifyModule, "NotifyError")
      .mockImplementation(() => {});

    // user A's edit arrives on disk (a whole valid session file, different
    // content) while B's lameta still has the session in memory.
    const remoteXml = fs
      .readFileSync(sessionFilePath, "utf8")
      .replace("</Session>", "  <location>REMOTE EDIT FROM USER A</location>\n</Session>");
    externallyReplace(sessionFilePath, remoteXml);

    // B edits a different field and saves.
    session.properties.setText("title", "TITLE TYPED BY USER B");
    file.save();

    // Our version won the canonical name...
    const canonical = fs.readFileSync(sessionFilePath, "utf8");
    expect(canonical).toContain("TITLE TYPED BY USER B");
    expect(canonical).not.toContain("REMOTE EDIT FROM USER A");

    // ...and A's edit was preserved in exactly one set-aside sibling.
    const siblings = setAsideSiblings(folder);
    expect(siblings.length).toBe(1);
    expect(siblings[0].endsWith(".session")).toBe(true);
    const setAside = fs.readFileSync(Path.join(folder, siblings[0]), "utf8");
    expect(setAside).toContain("REMOTE EDIT FROM USER A");

    // Exactly one gentle warning; no raw error toast.
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0]).toLowerCase()).toContain(
      "outside of lameta"
    );
    expect(errorSpy).not.toHaveBeenCalled();
    expect(file.metadataChangedExternally).toBe(true);

    // The NEXT save (no new external change) writes normally: no additional
    // set-aside, no additional warning.
    session.properties.setText("title", "SECOND EDIT BY USER B");
    file.save();
    expect(setAsideSiblings(folder).length).toBe(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(fs.readFileSync(sessionFilePath, "utf8")).toContain(
      "SECOND EDIT BY USER B"
    );
  });

  it("does NOT set aside on mere mtime churn (sync engine rewrote byte-identical content)", () => {
    const { folder, session, sessionFilePath } = makeSavedSession();
    const file = session.metadataFile!;

    const warnSpy = vi
      .spyOn(NotifyModule, "NotifyWarning")
      .mockImplementation(() => {});

    // The sync engine rewrites the exact same bytes lameta last wrote, only
    // bumping the mtime -- no real edit.
    const sameBytes = fs.readFileSync(sessionFilePath, "utf8");
    externallyReplace(sessionFilePath, sameBytes);

    session.properties.setText("title", "EDIT AFTER CHURN");
    file.save();

    expect(setAsideSiblings(folder).length).toBe(0);
    expect(warnSpy).not.toHaveBeenCalled();
    expect(file.metadataChangedExternally).toBe(false);
    expect(fs.readFileSync(sessionFilePath, "utf8")).toContain(
      "EDIT AFTER CHURN"
    );
  });
});
