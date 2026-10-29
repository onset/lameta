import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as realFs from "fs";
import * as os from "os";
import * as Path from "path";
import { spawn, ChildProcess } from "child_process";

// Saving a metadata file must never leave it empty or half-written. Writing the file in
// place truncates it first, so a save that is cut off (power loss, a drive pulled out,
// an I/O error) used to leave a zero-byte .session or .meta (Sentry LAMETA-37A,
// LAMETA-383). These tests make single fs calls fail on demand to stand in for that.

const failures = new Map<string, NodeJS.ErrnoException>();
const calls: string[] = [];

vi.mock("fs", async (importOriginal) => {
  const original = (await importOriginal()) as typeof import("fs");
  const wrapped: any = { ...original };
  for (const name of [
    "openSync",
    "writeSync",
    "writeFileSync",
    "fsyncSync",
    "closeSync",
    "renameSync",
  ]) {
    wrapped[name] = (...args: any[]) => {
      calls.push(name);
      const failure = failures.get(name);
      if (failure) throw failure;
      return (original as any)[name](...args);
    };
  }
  return { ...wrapped, default: wrapped };
});

import { PatientFS } from "./patientFile";
import { Session } from "../model/Project/Session/Session";
import { EncounteredVocabularyRegistry } from "../model/Project/EncounteredVocabularyRegistry";

function errorWithCode(code: string): NodeJS.ErrnoException {
  const error: NodeJS.ErrnoException = new Error(`simulated ${code}`);
  error.code = code;
  return error;
}

const oldXml = `<?xml version="1.0" encoding="utf-8"?>
<Session>
  <title type="string">The old title</title>
</Session>`;
const newXml = `<?xml version="1.0" encoding="utf-8"?>
<Session>
  <title type="string">The new title</title>
</Session>`;

let dir: string;
let target: string;

beforeEach(() => {
  failures.clear();
  calls.length = 0;
  dir = realFs.mkdtempSync(Path.join(os.tmpdir(), "lameta-save-"));
  target = Path.join(dir, "tha016.session");
});

afterEach(() => {
  failures.clear();
  try {
    realFs.chmodSync(target, 0o666);
  } catch {
    // the test may not have created it
  }
  realFs.rmSync(dir, { recursive: true, force: true });
});

function filesInDir() {
  return realFs.readdirSync(dir).sort();
}

describe("saving a metadata file", () => {
  it("replaces the file's contents and leaves no other file behind", () => {
    realFs.writeFileSync(target, oldXml);
    PatientFS.writeFileSyncWithNotifyThenRethrow(target, newXml);
    expect(realFs.readFileSync(target, "utf8")).toBe(newXml);
    expect(filesInDir()).toEqual(["tha016.session"]);
  });

  it("creates the file when it does not exist yet", () => {
    PatientFS.writeFileSyncWithNotifyThenRethrow(target, newXml);
    expect(realFs.readFileSync(target, "utf8")).toBe(newXml);
    expect(filesInDir()).toEqual(["tha016.session"]);
  });

  it("writes text that is not ASCII", () => {
    const xml = newXml.replace("The new title", "Ẹ̀dó 中文 Ελληνικά");
    PatientFS.writeFileSyncWithNotifyThenRethrow(target, xml);
    expect(realFs.readFileSync(target, "utf8")).toBe(xml);
  });

  it("flushes the new contents to disk before they replace the old file", () => {
    realFs.writeFileSync(target, oldXml);
    calls.length = 0;
    PatientFS.writeFileSyncWithNotifyThenRethrow(target, newXml);
    expect(calls).toContain("fsyncSync");
    expect(calls.lastIndexOf("fsyncSync")).toBeLessThan(calls.lastIndexOf("renameSync"));
  });

  for (const [step, call, code] of [
    ["writing the new contents", "writeSync", "ENOSPC"],
    ["flushing them to disk", "fsyncSync", "EIO"],
    ["replacing the old file", "renameSync", "EIO"],
  ]) {
    it(`leaves the old file whole when ${step} fails`, () => {
      realFs.writeFileSync(target, oldXml);
      failures.set(call, errorWithCode(code));
      expect(() => PatientFS.writeFileSyncWithNotifyThenRethrow(target, newXml)).toThrow(code);
      failures.clear();
      expect(realFs.readFileSync(target, "utf8")).toBe(oldXml);
      expect(filesInDir()).toEqual(["tha016.session"]);
    });
  }

  it("replaces a temporary file that an earlier, interrupted save left behind", () => {
    realFs.writeFileSync(target, oldXml);
    realFs.writeFileSync(target + ".lameta-saving.meta", "<Session><title>half");
    PatientFS.writeFileSyncWithNotifyThenRethrow(target, newXml);
    expect(realFs.readFileSync(target, "utf8")).toBe(newXml);
    expect(filesInDir()).toEqual(["tha016.session"]);
  });

  // A temporary name ending in ".meta" is also the name of the metadata file of a
  // file named without the ".meta", which lameta must not overwrite or delete.
  for (const failing of [false, true]) {
    it(`leaves the metadata of a file named like the temporary file alone when the save ${
      failing ? "fails" : "succeeds"
    }`, () => {
      realFs.writeFileSync(target, oldXml);
      const media = target + ".lameta-saving";
      const mediaMeta = media + ".meta";
      realFs.writeFileSync(media, "not really audio");
      realFs.writeFileSync(mediaMeta, "<Meta><notes>keep me</notes></Meta>");
      if (failing) failures.set("renameSync", errorWithCode("EIO"));
      const save = () => PatientFS.writeFileSyncWithNotifyThenRethrow(target, newXml);
      if (failing) expect(save).toThrow("EIO");
      else save();
      failures.clear();
      expect(realFs.readFileSync(mediaMeta, "utf8")).toBe("<Meta><notes>keep me</notes></Meta>");
      expect(realFs.readFileSync(target, "utf8")).toBe(failing ? oldXml : newXml);
      expect(filesInDir()).toEqual(
        [
          "tha016.session",
          "tha016.session.lameta-saving",
          "tha016.session.lameta-saving.meta",
        ].sort(),
      );
    });
  }

  it("does not change a read-only file", () => {
    realFs.writeFileSync(target, oldXml);
    realFs.chmodSync(target, 0o444);
    expect(() => PatientFS.writeFileSyncWithNotifyThenRethrow(target, newXml)).toThrow();
    expect(realFs.readFileSync(target, "utf8")).toBe(oldXml);
    expect(filesInDir()).toEqual(["tha016.session"]);
  }, 60000);

  it.runIf(process.platform !== "win32")("keeps the file's permissions", () => {
    realFs.writeFileSync(target, oldXml);
    realFs.chmodSync(target, 0o640);
    PatientFS.writeFileSyncWithNotifyThenRethrow(target, newXml);
    expect(realFs.statSync(target).mode & 0o777).toBe(0o640);
  });
});

// Another program (an antivirus scanner, a sync service) holds the file open without
// letting others delete or replace it, the way Windows programs commonly do.
function holdFile(path: string, milliseconds: number): ChildProcess {
  const ready = path + ".held";
  const script = [
    `$s = [System.IO.File]::Open('${path}', 'Open', 'Read', 'ReadWrite')`,
    `Set-Content -LiteralPath '${ready}' -Value held`,
    `Start-Sleep -Milliseconds ${milliseconds}`,
    `$s.Close()`,
  ].join("; ");
  const child = spawn("powershell", ["-NoProfile", "-Command", script], {
    stdio: "ignore",
  });
  const deadline = Date.now() + 20000;
  while (!realFs.existsSync(ready)) {
    if (Date.now() > deadline) throw new Error("the holder never started");
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  }
  realFs.rmSync(ready);
  return child;
}

function exited(child: ChildProcess) {
  return new Promise((resolve) =>
    child.exitCode !== null ? resolve(null) : child.on("exit", resolve),
  );
}

describe.runIf(process.platform === "win32")(
  "saving a metadata file that another program holds open",
  () => {
    it("saves once the other program lets go", async () => {
      realFs.writeFileSync(target, oldXml);
      const holder = holdFile(target, 3000);
      PatientFS.writeFileSyncWithNotifyThenRethrow(target, newXml);
      await exited(holder);
      expect(realFs.readFileSync(target, "utf8")).toBe(newXml);
      expect(filesInDir()).toEqual(["tha016.session"]);
    }, 60000);

    it("leaves the old file whole when the other program never lets go", async () => {
      realFs.writeFileSync(target, oldXml);
      const holder = holdFile(target, 30000);
      try {
        expect(() => PatientFS.writeFileSyncWithNotifyThenRethrow(target, newXml)).toThrow();
      } finally {
        holder.kill();
        await exited(holder);
      }
      expect(realFs.readFileSync(target, "utf8")).toBe(oldXml);
      expect(filesInDir()).toEqual(["tha016.session"]);
    }, 60000);
  },
);

describe("a session whose save fails", () => {
  function loadSession() {
    const sessionDir = Path.join(dir, "tha016");
    realFs.mkdirSync(sessionDir, { recursive: true });
    const sessionPath = Path.join(sessionDir, "tha016.session");
    if (!realFs.existsSync(sessionPath)) realFs.writeFileSync(sessionPath, oldXml);
    const session = Session.fromDirectory(sessionDir, new EncounteredVocabularyRegistry());
    return { session, sessionDir, sessionPath };
  }

  it("keeps the old file whole and still saves the edit on the next try", () => {
    const { session, sessionPath } = loadSession();
    session.properties.setText("title", "The new title");

    failures.set("renameSync", errorWithCode("EIO"));
    session.saveFolderMetaData();
    failures.clear();
    expect(realFs.readFileSync(sessionPath, "utf8")).toContain("The old title");

    session.saveFolderMetaData();
    expect(realFs.readFileSync(sessionPath, "utf8")).toContain("The new title");
  });

  it("leaves no empty .session behind when creating a new session's file is cut off", () => {
    const sessionDir = Path.join(dir, "brand-new");
    realFs.mkdirSync(sessionDir);
    failures.set("renameSync", errorWithCode("EIO"));
    expect(() => Session.fromDirectory(sessionDir, new EncounteredVocabularyRegistry())).toThrow(
      "EIO",
    );
    failures.clear();
    expect(realFs.readdirSync(sessionDir)).toEqual([]);

    Session.fromDirectory(sessionDir, new EncounteredVocabularyRegistry());
    expect(realFs.readFileSync(Path.join(sessionDir, "brand-new.session"), "utf8")).toContain(
      "<Session>",
    );
  });

  it("does not list a temporary file that a crash left behind", () => {
    const { sessionDir } = loadSession();
    realFs.writeFileSync(Path.join(sessionDir, "tha016.wav"), "not audio");
    realFs.writeFileSync(
      Path.join(sessionDir, "tha016.session.lameta-saving.meta"),
      "<Session><title>half",
    );
    realFs.writeFileSync(
      Path.join(sessionDir, "tha016.wav.meta.lameta-saving.meta"),
      "<Meta><notes>half",
    );
    const session = Session.fromDirectory(sessionDir, new EncounteredVocabularyRegistry());
    expect(session.files.map((f) => Path.basename(f.getActualFilePath()))).toEqual([
      "tha016.session",
      "tha016.wav",
    ]);
  });
});
