import fs from "fs";
import * as Path from "path";
import { Page, test, expect } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { createNewProject, E2eProject } from "./various-e2e-helpers";

/*
  Regression: a session folder/metadata file that vanishes from disk EXTERNALLY
  while the project is open (a collaborator renamed/deleted it on another machine
  and OneDrive/Dropbox applied it locally; or someone deleted it in Explorer)
  must not wound the running app. Concretely:

   (symptom 1) a stale save must NOT spam a raw ENOENT error toast on every save
     trigger (window blur, selection change). It should fail softly.
   (symptom 2) the session-detail pane must keep rendering for OTHER sessions --
     including a brand-new one made with the New Session button.

  Unlike twoUserSync.e2e.ts (which relaunches the app per scenario and so cannot
  observe the wound persisting), this test keeps ONE app instance so it pins the
  "does the wound carry into the next session?" symptom.
*/

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

// Raw file.save() error toasts seen in the renderer console during the test.
let rawSaveErrors: string[] = [];

function sessionDir(id: string) {
  return Path.join(project.projectDirectory, "Sessions", id);
}

async function createSession(id: string) {
  await project.goToSessions();
  await project.addSession();
  const idField = page.getByTestId("field-id-edit");
  await idField.waitFor({ state: "visible" });
  await idField.click();
  await idField.fill(id);
  await page.keyboard.press("Tab");
  await page.waitForTimeout(300);
}

async function selectSession(id: string) {
  await page.getByRole("gridcell", { name: id }).first().click();
  await page.waitForTimeout(300);
}

test.describe("vanished session must not wound the app", () => {
  test.setTimeout(120_000);

  test.beforeEach(async () => {
    lameta = new LametaE2ERunner();
    page = await lameta.launch();
    rawSaveErrors = [];
    // Watch for the raw, per-trigger "(file.save)" error that symptom 1 spammed.
    page.on("console", (msg) => {
      if (msg.type() === "error" && msg.text().includes("(file.save)")) {
        rawSaveErrors.push(msg.text());
      }
    });
    await lameta.cancelRegistration();
    project = await createNewProject(lameta, `Vanished_${Date.now()}`);
  });
  test.afterEach(async () => {
    await lameta.quit();
  });

  test("after a session vanishes and saves fail, a NEW session still renders and there is no raw error spam", async () => {
    await createSession("keeper");
    await createSession("victim");
    // force victim to save so its folder/files exist on disk
    await selectSession("keeper");
    await expect
      .poll(() => fs.existsSync(sessionDir("victim")), { timeout: 10_000 })
      .toBe(true);

    // The session vanishes from disk behind the app's back.
    fs.rmSync(sessionDir("victim"), { recursive: true, force: true });

    // The user (whose list still shows it) selects it -- this renders the
    // detail pane against a File whose on-disk file is now gone -- then moves
    // back and forth several times, each of which triggers a (failing) save of
    // the stale victim. Before the fix, each of these popped a fresh raw toast.
    await selectSession("victim");
    await selectSession("keeper");
    await selectSession("victim");
    await selectSession("keeper");

    // symptom 2: a brand-new session must still render its detail form.
    await project.goToSessions();
    await project.addSession();
    const idField = page.getByTestId("field-id-edit");
    await idField.waitFor({ state: "visible", timeout: 15_000 });
    await expect(idField).toBeVisible();

    // symptom 1: the stale saves must NOT have produced raw "(file.save)"
    // error toasts (the fix warns softly, at most once, via a different path).
    expect(rawSaveErrors).toHaveLength(0);
  });
});
