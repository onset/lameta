import fs from "fs";
import * as Path from "path";
import { Page, test, expect } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { createNewProject, E2eProject } from "./various-e2e-helpers";

/*
  EXPERIMENT (opt-in): what happens when two people share a lameta project via
  a cloud-sync service (OneDrive/Dropbox/...) and both have lameta open?

  From the point of view of a running lameta instance on machine B, everything
  user A does arrives as EXTERNAL filesystem changes made by the sync client
  while the project is open. We simulate exactly that: launch the real app,
  then mutate/rename/delete project files behind its back and observe what the
  app does next. No cloud account needed — the sync client's local behavior is
  just file I/O.

  These tests LOG findings (grep the output for TWOUSER-FINDING); assertions
  pin only what we're confident of. Run with:

     LAMETA_EXPERIMENT=1 npx playwright test twoUserSync
*/

const experimentEnabled = !!process.env.LAMETA_EXPERIMENT;

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

function sessionDir(id: string) {
  return Path.join(project.projectDirectory, "Sessions", id);
}
function sessionFile(id: string) {
  return Path.join(sessionDir(id), `${id}.session`);
}
function logFinding(msg: string) {
  console.log(`TWOUSER-FINDING: ${msg}`);
}

async function createSession(id: string, baselineNote: string) {
  await project.goToSessions();
  await project.addSession();
  const idField = page.getByTestId("field-id-edit");
  await idField.waitFor({ state: "visible" });
  await idField.click();
  await idField.fill(id);
  await page.keyboard.press("Tab");
  await typeIntoNotes(baselineNote);
  // back to the main session form
  await page.getByRole("tab", { name: "Session", exact: true }).first().click();
  await page.waitForTimeout(300);
}

async function setLocation(text: string) {
  const locationField = page.getByTestId("field-location-edit");
  await locationField.waitFor({ state: "visible" });
  await locationField.click();
  await locationField.fill(text);
  await page.keyboard.press("Tab");
  await page.waitForTimeout(300);
}

async function selectSession(id: string) {
  await page.getByRole("gridcell", { name: id }).first().click();
  await page.waitForTimeout(300);
}

async function typeIntoNotes(text: string) {
  await project.goToNotesOfThisSession();
  const notes = page.getByTestId("field-notes-edit");
  await notes.waitFor({ state: "visible" });
  await notes.click();
  await page.keyboard.type(text);
  await page.keyboard.press("Tab");
  await page.waitForTimeout(300);
}

test.describe("Two-user cloud-sync hazards (experiment)", () => {
  test.skip(!experimentEnabled, "opt-in experiment: set LAMETA_EXPERIMENT=1");
  test.setTimeout(180_000);

  // Fresh app per test: a remotely-vanished session wounds the running app
  // (the session-detail pane stops rendering until restart — itself one of the
  // findings), so scenarios can't share an instance.
  test.beforeEach(async () => {
    lameta = new LametaE2ERunner();
    page = await lameta.launch();
    await lameta.cancelRegistration();
    project = await createNewProject(lameta, `TwoUserSync_${Date.now()}`);
    // a "parking" session we can select to force the previous one to save
    await createSession("parking", "parking lot note");
  });
  test.afterEach(async () => {
    await lameta.quit();
  });

  test("stale-overwrite: does user B's save clobber user A's synced-down edit?", async () => {
    await createSession("stalecase", "original note text");
    await selectSession("parking"); // forces save of stalecase
    await expect
      .poll(() => fs.existsSync(sessionFile("stalecase")), { timeout: 10_000 })
      .toBe(true);
    const savedXml = fs.readFileSync(sessionFile("stalecase"), "utf8");
    expect(savedXml).toContain("original note text");

    // user A edits the notes on their machine; the change syncs down to B's
    // disk while B's lameta still holds the session in memory
    fs.writeFileSync(
      sessionFile("stalecase"),
      savedXml.replace("original note text", "REMOTE EDIT FROM USER A")
    );

    // B looks at the session: does the UI show A's edit or the stale memory?
    await selectSession("stalecase");
    await project.goToNotesOfThisSession();
    const shownNotes = await page.getByTestId("field-notes-edit").innerText();
    logFinding(
      `after remote edit synced down, B's UI shows notes: "${shownNotes.trim()}"`
    );
    await page.getByRole("tab", { name: "Session", exact: true }).first().click();

    // B edits a DIFFERENT field (location) and it saves
    await setLocation("location typed by user B");
    await selectSession("parking"); // forces save of stalecase

    await expect
      .poll(
        () => fs.readFileSync(sessionFile("stalecase"), "utf8"),
        { timeout: 10_000 }
      )
      .toContain("location typed by user B");
    const finalXml = fs.readFileSync(sessionFile("stalecase"), "utf8");
    const remoteEditSurvived = finalXml.includes("REMOTE EDIT FROM USER A");

    // With the freshness check in File.save(), B's stale write no longer
    // clobbers A's synced-down edit: before writing its own version to the
    // canonical name, lameta moves the externally-changed file aside to a
    // sibling. Look for that set-aside copy and confirm A's edit is preserved
    // in it (the canonical file now holds B's location edit).
    const setAside = fs
      .readdirSync(sessionDir("stalecase"))
      .filter((f) => f.includes("changed on another computer"));
    const setAsideHoldsRemoteEdit = setAside.some((f) =>
      fs
        .readFileSync(Path.join(sessionDir("stalecase"), f), "utf8")
        .includes("REMOTE EDIT FROM USER A")
    );
    const nothingLost = remoteEditSurvived || setAsideHoldsRemoteEdit;
    logFinding(
      `after B saved another field: canonical file still holds A's edit? ${remoteEditSurvived}; set-aside sibling(s) preserving A's edit: [${setAside.join(
        ", "
      )}]`
    );
    logFinding(
      nothingLost
        ? `user A's remote edit was NOT lost (preserved ${
            setAsideHoldsRemoteEdit ? "in a set-aside sibling" : "in place"
          }); B's own edit is in the canonical file`
        : "user A's remote edit was SILENTLY REVERTED by user B's save (stale in-memory state written over it, no set-aside copy)"
    );
    // B's own edit must have landed in the canonical file regardless.
    expect(finalXml).toContain("location typed by user B");
  });

  test("remote delete: user A deleted the session; B edits it afterwards", async () => {
    await createSession("delcase", "Delete Victim");
    await selectSession("parking");
    await expect
      .poll(() => fs.existsSync(sessionFile("delcase")), { timeout: 10_000 })
      .toBe(true);

    // user A deletes the session; sync engine removes it on B's disk
    fs.rmSync(sessionDir("delcase"), { recursive: true, force: true });

    // B (list still shows it) selects it and tries to edit
    await selectSession("delcase");
    try {
      await typeIntoNotes("edit after remote delete");
      logFinding("after remote delete, B could still type into the session");
    } catch (e) {
      logFinding(
        `after remote delete, B's UI broke trying to edit the session: ${String(e).split("\n")[0]}`
      );
    }
    try {
      await selectSession("parking");
    } catch (e) {
      logFinding(
        `after remote delete, B could not even select another session: ${String(e).split("\n")[0]}`
      );
    }
    await page.waitForTimeout(2000);

    const recreated = fs.existsSync(sessionFile("delcase"));
    logFinding(
      recreated
        ? "B's save RESURRECTED the deleted session (it will sync back to user A)"
        : `B's save did not resurrect the deleted session; dir exists: ${fs.existsSync(sessionDir("delcase"))}`
    );
  });
  test("remote rename: user A renamed the session; B edits it afterwards", async () => {
    await createSession("renbefore", "Rename Victim");
    await selectSession("parking");
    await expect
      .poll(() => fs.existsSync(sessionFile("renbefore")), { timeout: 10_000 })
      .toBe(true);

    // user A renames the session id on their machine → folder + files rename,
    // and the sync engine applies that on B's disk:
    fs.renameSync(
      sessionFile("renbefore"),
      Path.join(sessionDir("renbefore"), "renafter.session")
    );
    fs.renameSync(sessionDir("renbefore"), sessionDir("renafter"));
    // (contents of renafter.session still say id "renbefore"; on A's machine
    // it would say "renafter" — patch that too for realism)
    const xml = fs.readFileSync(sessionFile("renafter"), "utf8");
    fs.writeFileSync(sessionFile("renafter"), xml.replace(/renbefore/g, "renafter"));

    // B (whose list still shows the old id) selects it and edits notes
    await selectSession("renbefore");
    await typeIntoNotes("edit after remote rename");
    await selectSession("parking");
    await page.waitForTimeout(2000);

    const sessionsRoot = Path.join(project.projectDirectory, "Sessions");
    const tree = fs
      .readdirSync(sessionsRoot)
      .map(
        (d) =>
          `${d}: [${fs.readdirSync(Path.join(sessionsRoot, d)).join(", ")}]`
      )
      .join(" | ");
    logFinding(`after remote rename + local edit, Sessions tree: ${tree}`);
    const oldRecreated = fs.existsSync(sessionDir("renbefore"));
    logFinding(
      oldRecreated
        ? "B's save RECREATED the old-named folder → project now has BOTH old and new folders; when this syncs back, user A sees a duplicated session"
        : "B's save did not recreate the old-named folder"
    );
  });

});
