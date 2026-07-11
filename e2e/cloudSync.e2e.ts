import { test, expect, Page } from "@playwright/test";
import * as fs from "fs";
import * as Path from "path";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { createNewProject, E2eProject } from "./various-e2e-helpers";

// Exercises the cloud-sync UI (row status icon, "<Provider> Status" card,
// hydrate button) end to end using the e2e-controllable FakeCloudFileProvider
// (see src/other/fakeCloudProvider.ts) instead of a real OneDrive/Dropbox/
// iCloud account -- so this test runs the same way on any machine/OS.
//
// The fake provider reads its manifest (which file(s) are cloud-only, and
// which folder is the fake sync root) from the JSON file named by
// E2E_FAKE_CLOUD_PROVIDER, and it loads that manifest exactly once, on first
// use -- which happens as soon as the app constructs its very first File
// object (the project's own metadata file), well before we've created a
// session or added a file through the UI. So the manifest has to name the
// media file's FINAL on-disk path before the app is even launched.
//
// Project.addSession() names a brand-new project's first session folder
// deterministically: sanitizeForArchive("New Session") under the default
// ("ASCII") file-naming rules turns spaces into underscores, giving
// "New_Session", and getUniqueFolder() will use that name as-is since
// nothing else has claimed it yet in a fresh project. That lets us predict
// the session folder -- and therefore the added media file's absolute path
// -- before launch.
let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

const projectName = "CloudSyncE2E";
const mediaFileName = "cloud-test-audio.mp3";

let projectDirectory: string;
let sessionDirectory: string;
let mediaFilePath: string;
let manifestPath: string;

test.describe("Cloud sync UI (fake provider)", () => {
  test.beforeAll(async ({}) => {
    // process.env.E2ERoot is set once, for the whole Playwright run, by
    // e2e/globalSetup.ts -- see various-e2e-helpers.ts for the same
    // assumption (E2eProject.createNewProject computes projectDirectory the
    // same way).
    const e2eRoot = process.env.E2ERoot!;
    projectDirectory = Path.join(e2eRoot, "lameta", projectName);
    sessionDirectory = Path.join(projectDirectory, "Sessions", "New_Session");
    mediaFilePath = Path.join(sessionDirectory, mediaFileName);

    manifestPath = Path.join(e2eRoot, "fake-cloud-manifest.json");
    fs.writeFileSync(
      manifestPath,
      JSON.stringify({
        syncRoots: [{ path: projectDirectory, providerName: "FakeDrive" }],
        cloudOnly: [mediaFilePath],
        hydrateDelayMs: 500
      })
    );
    // Must be set before launch(): LametaE2ERunner.launch() spreads
    // process.env into the Electron process's env at spawn time.
    process.env.E2E_FAKE_CLOUD_PROVIDER = manifestPath;

    lameta = new LametaE2ERunner();
    page = await lameta.launch();
    await lameta.cancelRegistration();
    project = await createNewProject(lameta, projectName);

    // Fail fast with a clear message if the project directory didn't land
    // where predicted (e.g. a duplicate-name retry appended a suffix)
    // instead of a confusing failure later on.
    expect(project.projectDirectory).toBe(projectDirectory);
  });

  test.afterAll(async ({}) => {
    delete process.env.E2E_FAKE_CLOUD_PROVIDER;
    await lameta.quit();
  });

  test("shows the fake provider's cloud status, lets the user fetch the file, and clears once hydrated", async ({}) => {
    await project.goToSessions();
    await project.addSession();

    // (a) Add a real media file -- its bytes are real and readable the whole
    // time; only the STATUS lameta reads is faked (see fakeCloudProvider.ts).
    const sourceMp3 = Path.join(
      process.cwd(),
      "sample data",
      "Edolo sample",
      "Sessions",
      "ETR009",
      "ETR009_Careful.mp3"
    );
    if (!fs.existsSync(sourceMp3)) {
      throw new Error(`Source sample mp3 not found at ${sourceMp3}`);
    }
    const stagedSource = Path.join(process.env.E2ERoot!, mediaFileName);
    fs.copyFileSync(sourceMp3, stagedSource);

    await lameta.mockShowOpenDialog([stagedSource]);
    await page.getByRole("button", { name: "Add Files" }).click();

    const fileCell = page.getByRole("gridcell", { name: mediaFileName });
    await expect(fileCell).toBeVisible({ timeout: 10000 });

    // Sanity check our predicted path actually matches where lameta put the
    // file -- if this fails, the manifest named the wrong path and every
    // assertion below would otherwise fail for a confusing reason. The row
    // can appear before the background copy finishes (a known race -- see
    // the comments in FileList-e2e-helpers.ts's addFile()), so poll instead
    // of asserting once.
    await expect
      .poll(() => fs.existsSync(mediaFilePath), { timeout: 10000 })
      .toBe(true);

    // (b) The row shows the "online-only" cloud status icon (an svg with
    // role="img" whose accessible name comes from its <title>; see
    // CloudStatusIcon.tsx).
    const fileRow = page.getByRole("row").filter({ has: fileCell });
    await expect(fileRow.getByRole("img", { name: /Online-only/ })).toBeVisible(
      { timeout: 10000 }
    );

    // (c) Selecting the file shows the "FakeDrive Status" card with a
    // "Download this file to my computer" button instead of a preview
    // (CloudFileFetchControl renders this whenever canPin is false and the
    // file isCloudFileNotPresent; see CloudFilePanel.tsx).
    await fileCell.click();
    const statusHeading = page.getByRole("heading", {
      name: "FakeDrive Status"
    });
    await expect(statusHeading).toBeVisible({ timeout: 10000 });
    const downloadButton = page.getByRole("button", {
      name: "Download this file to my computer"
    });
    await expect(downloadButton).toBeVisible();

    // (d) Clicking it asks the fake provider to hydrate the file; after
    // hydrateDelayMs (500ms) the fake reports "local" and, once the
    // polling reads that (every 1.5s, see cloudFilePoller.ts), the card
    // goes away because the file is no longer isCloudFileNotPresent.
    await downloadButton.click();
    await expect(statusHeading).not.toBeVisible({ timeout: 10000 });

    // The row's "online-only" icon is gone too (a local file shows no cloud
    // icon at all, per CloudStatusIcon.tsx's current design).
    await expect(
      fileRow.getByRole("img", { name: /Online-only/ })
    ).not.toBeVisible({ timeout: 5000 });
  });
});
