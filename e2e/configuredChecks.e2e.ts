import { test, expect, Page } from "@playwright/test";
import * as fs from "fs";
import * as Path from "path";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { launchWithProject, E2eProject } from "./various-e2e-helpers";
import { addFile, entries, groupOf, newSession, openSidebar } from "./problems-e2e-helpers";
import { ContributorsHelper } from "./contributors-e2e-helpers";

// Which of lameta's checks run is up to the configuration's settings.json5 (see
// src/problems/checkSettings.ts): every configuration starts from lameta's list, and an
// archive adds its own checks or turns some off.

test.describe("A project with no archive", () => {
  let lameta: LametaE2ERunner;
  let page: Page;
  let project: E2eProject;

  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    project = await launchWithProject(lameta, "NoArchiveChecks");
    page = lameta.page;
  });
  test.afterAll(async () => {
    await lameta.quit();
  });

  test("gets the checks in lameta's list and none of ELAR's", async () => {
    await newSession(project, page, "PLAIN");
    // a format, and a name without a date stamp, that ELAR does not allow
    await addFile(lameta, page, "notes.docx");
    await page.locator(".fileList .rt-tr", { hasText: "PLAIN.session" }).click();
    await new ContributorsHelper(page, project).goToContributorsTab();
    await new ContributorsHelper(page, project).addContributor("Dami Asan");
    await openSidebar(page);
    const session = groupOf(page, "session:PLAIN");
    // contributorWithoutPerson, from lameta's list
    await expect(session.locator(entries(page, "contributorWithoutPerson"))).toBeVisible({
      timeout: 15000,
    });
    for (const elarCheck of [
      "fileExtension",
      "fileNameDateStamp",
      "fileNameContainsSessionId",
      "projectName",
      // ELAR's rules.js
      "checkActorRole",
    ])
      await expect(entries(page, elarCheck)).toHaveCount(0);
  });
});

// A configuration made for this test, from src/problems/test-fixtures, that turns off
// contributorWithoutConsent. lameta finds configurations in the app's folder, so it is
// copied there for the test.
test.describe("A configuration that turns off a check in lameta's list", () => {
  const configurationName = "e2e-WithoutConsentCheck";
  const configurationFolder = Path.join(
    process.env.E2E_LAMETA_APP_DIR || ".",
    "archive-configurations",
    configurationName,
  );
  let lameta: LametaE2ERunner;
  let page: Page;
  let project: E2eProject;

  test.beforeAll(async () => {
    fs.cpSync(
      "src/problems/test-fixtures/archive-configurations/WithoutConsentCheck",
      configurationFolder,
      { recursive: true },
    );
    lameta = new LametaE2ERunner();
    project = await launchWithProject(lameta, "WithoutConsentCheck", configurationName);
    page = lameta.page;
  });
  test.afterAll(async () => {
    await lameta?.quit();
    fs.rmSync(configurationFolder, { recursive: true, force: true });
  });

  test("does not get that check, and still gets the rest of the list", async () => {
    await project.goToPeople();
    await project.addPerson("Ilse Varo");
    await page.keyboard.press("Tab");
    await newSession(project, page, "NO-CONSENT-CHECK");
    const contributors = new ContributorsHelper(page, project);
    await contributors.goToContributorsTab();
    await contributors.addContributor("Ilse Varo", false);
    await openSidebar(page);
    // sessionWithoutFiles, from lameta's list
    await expect(
      groupOf(page, "session:NO-CONSENT-CHECK").locator(entries(page, "sessionWithoutFiles")),
    ).toBeVisible({ timeout: 15000 });
    // with no archive, Ilse Varo would have no consent on record (lametaChecks.e2e.ts)
    await expect(entries(page, "contributorWithoutConsent")).toHaveCount(0);
  });
});
