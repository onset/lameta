import fs from "fs";
import * as Path from "path";
import { spawn, ChildProcess } from "child_process";
import { Page, test, expect } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { createNewProject, E2eProject } from "./various-e2e-helpers";
import { E2eFileList } from "./FileList-e2e-helpers";

/*
  Renaming a person/session renames its folder and the files inside — the
  operation most at risk from other processes (antivirus, sync clients,
  indexers) holding transient locks. These tests verify, through the real app,
  the PatientFS contract:

   - while another process holds a file in the folder WITHOUT delete-sharing
     (which on Windows blocks renaming the folder), a rename attempt must fail
     CLEANLY: everything keeps its old name, nothing half-renamed;
   - once the lock is gone, the rename must succeed completely.

  Windows-only: on POSIX an open handle doesn't block renames, so the
  contention class doesn't exist there.
*/

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;
let fileList: E2eFileList;

test.describe("Rename under file-lock contention", () => {
  test.skip(process.platform !== "win32", "Windows-only contention semantics");
  // the failed rename alone spends ~10s in the PatientFS retry loop
  test.setTimeout(180_000);

  test.beforeEach(async () => {
    lameta = new LametaE2ERunner();
    page = await lameta.launch();
    await lameta.cancelRegistration();
    project = await createNewProject(
      lameta,
      "RenameContention" + Math.random().toString()
    );
    fileList = new E2eFileList(lameta, page, project.projectDirectory);
  });
  test.afterEach(async () => {
    await lameta.quit();
  });

  test("rename fails cleanly while a file is locked, then succeeds after release", async () => {
    await project.goToPeople();
    await project.addPerson();
    await setFullName("Paul Hewson");
    await page.waitForTimeout(1000);

    const personDir = Path.join(
      project.projectDirectory,
      "People",
      "Paul_Hewson"
    );
    expect(fs.existsSync(Path.join(personDir, "Paul_Hewson.person"))).toBe(
      true
    );
    const mediaPath = Path.join(personDir, "Paul_Hewson_foo.txt");
    await fileList.addFile("Paul_Hewson_foo.txt", { page, path: mediaPath });
    await fileList.selectFile("Paul_Hewson.person");

    // another process opens the media file with no delete-sharing: renaming
    // the file fails with EBUSY and renaming the folder fails with EPERM
    const holder = await holdFileOpen(mediaPath, 90);
    try {
      const filesBefore = fs.readdirSync(personDir).sort();

      // this triggers the rename attempt; the app spends a PatientFS retry
      // budget (~10s) on the locked file, another on the folder itself, then
      // gives up and rolls the file renames back
      await setFullName("Bono", 60_000);

      // first, prove the rename attempt really started: some file transiently
      // carries the new name (the mid-flight window lasts ~20s, poll can't
      // miss it). Without this gate the next poll could pass trivially before
      // the app even began.
      await expect
        .poll(
          () =>
            fs.existsSync(personDir)
              ? fs.readdirSync(personDir).some((f) => f.startsWith("Bono"))
              : false,
          {
            message:
              "the rename attempt never started (no file transiently got the new name)",
            timeout: 30_000
          }
        )
        .toBe(true);

      // then poll until the folder is back to exactly its old contents
      await expect
        .poll(
          () =>
            fs.existsSync(personDir) ? fs.readdirSync(personDir).sort() : [],
          {
            message:
              "after a failed rename, the folder must return to exactly its old contents (rollback)",
            timeout: 60_000
          }
        )
        .toEqual(filesBefore);
      expect(
        fs.existsSync(
          Path.join(project.projectDirectory, "People", "Bono")
        ),
        "no folder with the new name may exist after a failed rename"
      ).toBe(false);
    } finally {
      holder.kill();
    }
    // let the OS release the handle
    await page.waitForTimeout(1000);

    // now the same rename must go through completely
    await setFullName("Ali G", 60_000);
    await page.waitForTimeout(2000);

    const newDir = Path.join(project.projectDirectory, "People", "Ali_G");
    expect(fs.existsSync(newDir), "renamed folder must exist").toBe(true);
    expect(fs.existsSync(personDir), "old folder must be gone").toBe(false);
    expect(fs.existsSync(Path.join(newDir, "Ali_G.person"))).toBe(true);
    expect(fs.existsSync(Path.join(newDir, "Ali_G_foo.txt"))).toBe(true);
    expect(
      fs
        .readdirSync(newDir)
        .filter((f) => f.startsWith("Paul_Hewson") || f.startsWith("Bono")),
      "no files with stale names may remain"
    ).toEqual([]);
  });
});

// Open a file from a separate process with FileShare.ReadWrite (no Delete),
// the way scanners/sync clients do. Resolves once the handle is held.
function holdFileOpen(file: string, seconds: number): Promise<ChildProcess> {
  const ps = `
    $h = [System.IO.File]::Open('${file.replace(/'/g, "''")}',
        [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read,
        [System.IO.FileShare]::ReadWrite);
    [Console]::Out.WriteLine('HELD');
    Start-Sleep -Seconds ${seconds};
    $h.Close();
  `;
  const child = spawn("powershell", ["-NoProfile", "-Command", ps], {
    stdio: ["ignore", "pipe", "inherit"]
  });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("file holder never became ready")),
      15000
    );
    child.stdout!.on("data", (d) => {
      if (d.toString().includes("HELD")) {
        clearTimeout(timer);
        resolve(child);
      }
    });
  });
}

async function setFullName(name: string, timeout = 5000) {
  const fullNameField = page.getByTestId("field-name-edit");
  await fullNameField.waitFor({ state: "visible", timeout });
  await expect(fullNameField).not.toBeEmpty({ timeout });
  await fullNameField.click({ clickCount: 3, timeout });
  await page.keyboard.type(name);
  await fullNameField.press("Tab", { timeout });
}
