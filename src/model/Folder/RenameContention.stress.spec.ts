import fs from "fs";
import Path from "path";
import { spawn, ChildProcess } from "child_process";
import temp from "temp";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Session } from "../Project/Session/Session";
import { EncounteredVocabularyRegistry } from "../Project/EncounteredVocabularyRegistry";

/*
  Torture test for PatientFS: an external "meddler" process plays the role of an
  antivirus scanner / OneDrive / Dropbox / search indexer. It watches the project
  directory and, on every file event, briefly opens the changed file WITHOUT
  delete-sharing — which is exactly what real scanners do, and is what makes
  renames fail with EBUSY (the file itself) or EPERM (its parent directory).
  Meanwhile we drive session renames through the real Folder/Session code.

  LockedFileScenarios.spec.ts notes it "cannot simulate something getting locked
  mid-way through a rename" — this test can, because the meddler reacts to the
  rename events themselves, landing locks in the windows between the individual
  file renames and the final folder rename.

  Windows-only: on POSIX an open handle does not block rename, so the whole
  contention class doesn't exist there. Slow (retries sleep ~1s), so opt-in:

     LAMETA_STRESS=1 yarn vitest run RenameContention

  Real-provider mode: point it at a directory inside an actual syncing
  OneDrive/Dropbox root and the sync engine itself is the adversary — no
  artificial meddler is spawned, and media files are made big enough that
  uploads are still in flight when the renames land:

     LAMETA_STRESS=1 LAMETA_STRESS_DIR=C:\\OneDrive-tests\\OneDrive yarn vitest run RenameContention

  If this test fails, it found a real robustness bug; a pass after N cycles is
  evidence the PatientFS retry strategy is holding up.
*/

const RENAME_CYCLES = 12;

const stressEnabled =
  process.platform === "win32" && !!process.env.LAMETA_STRESS;
// When targeting a real cloud-synced directory, the provider is the meddler.
const realProviderDir = process.env.LAMETA_STRESS_DIR;
const mediaFileBytes = realProviderDir ? 8 * 1024 * 1024 : 32;

temp.track();

// The meddler: continuously picks a random file under the target directory and
// opens it with FileShare.ReadWrite — i.e. NO Delete sharing, so while held,
// renaming the file fails with EBUSY and renaming any ancestor directory fails
// with EPERM (verified empirically; that is exactly how AV scanners / sync
// clients / indexers interfere). Mostly short scanner-like holds, occasionally
// a long one to force multiple PatientFS retries.
const meddlerScript = `
param([string]$target)
[Console]::Out.WriteLine("MEDDLER-READY")
$rand = New-Object System.Random
while ($true) {
  try {
    $files = [System.IO.Directory]::GetFiles($target, '*', 'AllDirectories')
    if ($files.Length -gt 0) {
      $p = $files[$rand.Next($files.Length)]
      $holdMs = $rand.Next(30, 400)
      if ($rand.Next(8) -eq 0) { $holdMs = 1500 } # occasional slow scan
      $h = [System.IO.File]::Open($p, [System.IO.FileMode]::Open,
          [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
      [Console]::Out.WriteLine("HELD $holdMs $p")
      [System.Threading.Thread]::Sleep($holdMs)
      $h.Close()
    }
  } catch {}
  [System.Threading.Thread]::Sleep($rand.Next(10, 80))
}
`;

describe.skipIf(!stressEnabled)("Rename contention stress (PatientFS)", () => {
  let rootDirectory: string;
  let meddler: ChildProcess;
  const meddlerHolds: string[] = [];

  beforeAll(async () => {
    if (realProviderDir) {
      rootDirectory = Path.join(
        realProviderDir,
        `renameContention-${process.pid}`
      );
      fs.mkdirSync(rootDirectory, { recursive: true });
      return; // no artificial meddler; the sync engine is the adversary
    }
    rootDirectory = temp.mkdirSync("renameContention");
    const scriptPath = Path.join(rootDirectory, "..", "meddler.ps1");
    fs.writeFileSync(scriptPath, meddlerScript);
    meddler = spawn(
      "powershell",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath, "-target", rootDirectory],
      { stdio: ["ignore", "pipe", "inherit"] }
    );
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("meddler never became ready")),
        15000
      );
      meddler.stdout!.on("data", (d) => {
        const s = d.toString();
        for (const line of s.split(/\r?\n/))
          if (line.startsWith("HELD")) meddlerHolds.push(line);
        if (s.includes("MEDDLER-READY")) {
          clearTimeout(timer);
          resolve();
        }
      });
    });
  });

  afterAll(() => {
    meddler?.kill();
    if (realProviderDir) {
      try {
        fs.rmSync(rootDirectory, { recursive: true, force: true });
      } catch {
        // the provider may be holding something; leave it for manual cleanup
      }
    }
  });

  it(
    `survives ${RENAME_CYCLES} rename cycles while a scanner-like process grabs file handles`,
    { timeout: 600_000 },
    async () => {
      const startName = "cycle0";
      const dir = Path.join(rootDirectory, startName);
      fs.mkdirSync(dir);
      // In real-provider mode these are big enough that the sync engine is
      // still uploading them while we rename.
      const fakeMedia = Buffer.alloc(mediaFileBytes, 7);
      fs.writeFileSync(Path.join(dir, `${startName}_video.mp4`), fakeMedia);
      fs.writeFileSync(Path.join(dir, `${startName}_audio.wav`), fakeMedia);
      fs.writeFileSync(Path.join(dir, "unrelated.txt"), "not renamed");

      const session = Session.fromDirectory(
        dir,
        new EncounteredVocabularyRegistry()
      );
      session.properties.setText("id", startName);
      session.saveFolderMetaData();

      // Warm-up rename with no assertion: the first save/rename creates the
      // .meta sidecars, after which the file census must stay constant.
      session.properties.setText("id", "warmup");
      let warm = false;
      for (let t = 0; t < 5 && !warm; t++) {
        warm = session.nameMightHaveChanged();
      }
      expect(warm, "warmup rename never succeeded").toBe(true);
      let expectedName = "warmup";
      const expectedFileCount = fs.readdirSync(
        Path.join(rootDirectory, expectedName)
      ).length;

      const anomalies: string[] = [];
      const failedRenames: number[] = [];
      const cycleDurations: number[] = [];

      for (let i = 1; i <= RENAME_CYCLES; i++) {
        // Pause so the meddler (reacting to the previous cycle's file events)
        // is still holding handles when this rename runs — that's the mid-rename
        // collision we're trying to produce.
        await new Promise((r) => setTimeout(r, 100 + (i % 4) * 60));

        const newName = `cycle${i}`;
        session.properties.setText("id", newName);
        const t0 = Date.now();
        const succeeded = session.nameMightHaveChanged();
        cycleDurations.push(Date.now() - t0);
        // A rename may legitimately fail under sustained contention (the
        // retry budget is finite). That is NOT an anomaly by itself — the
        // contract is that a failed rename must leave the folder in the fully
        // consistent OLD state, and a successful one in the fully consistent
        // NEW state.
        if (succeeded) {
          expectedName = newName;
        } else {
          failedRenames.push(i);
        }

        const expectedDir = Path.join(rootDirectory, expectedName);

        // Invariant 1: exactly one directory, under the name the model believes in
        const dirs = fs
          .readdirSync(rootDirectory)
          .filter((f) =>
            fs.statSync(Path.join(rootDirectory, f)).isDirectory()
          );
        if (dirs.length !== 1 || dirs[0] !== expectedName) {
          anomalies.push(
            `cycle ${i}: expected single dir "${expectedName}", found [${dirs.join(", ")}]`
          );
          break; // state is corrupt; later cycles would just cascade
        }

        // Invariant 2: no files lost, no duplicated metadata, no stragglers
        // still carrying an older cycle's name
        const files = fs.readdirSync(expectedDir);
        const sessionFiles = files.filter((f) => f.endsWith(".session"));
        if (sessionFiles.length !== 1) {
          anomalies.push(
            `cycle ${i}: expected 1 .session file, found [${sessionFiles.join(", ")}]`
          );
        } else if (sessionFiles[0] !== `${expectedName}.session`) {
          anomalies.push(
            `cycle ${i}: .session file is "${sessionFiles[0]}" but folder is "${expectedName}"`
          );
        }
        if (files.length !== expectedFileCount) {
          anomalies.push(
            `cycle ${i}: expected ${expectedFileCount} files, found ${files.length}: [${files.join(", ")}]`
          );
        }
        const stragglers = files.filter(
          (f) =>
            /^(cycle\d+|warmup)/.test(f) &&
            !f.startsWith(expectedName + ".") &&
            !f.startsWith(expectedName + "_")
        );
        if (stragglers.length > 0) {
          anomalies.push(
            `cycle ${i}: files left behind with a stale name: [${stragglers.join(", ")}]`
          );
        }

        // Invariant 3: the in-memory model points at a file that exists
        if (!fs.existsSync(session.metadataFile!.metadataFilePath)) {
          anomalies.push(
            `cycle ${i}: model's metadataFilePath ${session.metadataFile!.metadataFilePath} does not exist on disk`
          );
        }
      }

      const retriedCycles = cycleDurations.filter((d) => d > 900).length;
      console.log(
        `meddler holds: ${meddlerHolds.length}, cycles that hit the PatientFS retry path (>900ms): ${retriedCycles}, ` +
          `renames that gave up: [${failedRenames.join(",")}], durations: ${cycleDurations.join(",")}`
      );
      // If the meddler never grabbed anything, this run was not a real torture
      // test — fail loudly rather than report false confidence. (In
      // real-provider mode we can't observe the provider's handles, so we just
      // report retry counts and trust the invariants.)
      if (!realProviderDir) expect(meddlerHolds.length).toBeGreaterThan(0);
      expect(anomalies, anomalies.join("\n")).toEqual([]);
    }
  );
});
