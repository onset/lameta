import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { launchWithProject, E2eProject } from "./various-e2e-helpers";
import { openSidebar } from "./problems-e2e-helpers";

// The top of the Problems sidebar says which set of checks is running: the archive
// configuration's short name when it adds checks of its own, as ELAR does, or Baseline
// when the project's checks are only lameta's own.

test.describe("The heading of the Problems sidebar, in an ELAR project", () => {
  let lameta: LametaE2ERunner;
  let page: Page;
  let project: E2eProject;

  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    project = await launchWithProject(lameta, "ChecksHeadingElar", "ELAR");
    page = lameta.page;
  });
  test.afterAll(async () => {
    await lameta.quit();
  });

  test("says ELAR Checks, and Baseline Checks once the configuration is changed to PARADISEC, which adds no checks", async () => {
    await openSidebar(page);
    await expect(page.getByTestId("problems-checks-heading")).toHaveText("ELAR Checks");

    await project.goToProjectConfiguration();
    await page.locator("#archiveConfigurationName-select").click();
    await page.getByText("PARADISEC", { exact: true }).click();
    await page.locator("button:has-text('Change')").click();
    await page.waitForSelector('[data-testid="project-tab"]', { timeout: 10000 });

    await openSidebar(page);
    await expect(page.getByTestId("problems-checks-heading")).toHaveText("Baseline Checks", {
      timeout: 10000,
    });
  });
});

test.describe("The heading of the Problems sidebar, in a project with no archive", () => {
  let lameta: LametaE2ERunner;
  let page: Page;

  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    await launchWithProject(lameta, "ChecksHeadingNoArchive");
    page = lameta.page;
  });
  test.afterAll(async () => {
    await lameta.quit();
  });

  test("says Baseline Checks", async () => {
    await openSidebar(page);
    await expect(page.getByTestId("problems-checks-heading")).toHaveText("Baseline Checks");
  });
});
