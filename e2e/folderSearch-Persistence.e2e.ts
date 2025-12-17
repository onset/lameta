import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { launchWithProject, E2eProject } from "./various-e2e-helpers";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

test.describe("Folder search persistence across tab switches", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    project = await launchWithProject(lameta, "SearchPersistProj");
    page = lameta.page;
  });
  test.afterAll(async () => {
    await lameta.quit();
  });

  test("search term and clear button persist when switching tabs", async () => {
    await project.goToSessions();
    await project.addSession();
    const input = page.getByTestId("folder-search-input");
    await input.fill("Session");
    await page.waitForTimeout(250);
    // ensure search registered (data-last-search reflects current query)
    await expect(page.getByTestId("folder-search-bar")).toHaveAttribute(
      "data-last-search",
      /Session/
    );
    // switch to Project tab
    await page.getByTestId("project-tab").click();
    // switch back to Sessions tab
    await page.getByTestId("sessions-tab").click();
    // search input should retain value and clear button visible
    await expect(page.getByTestId("folder-search-input")).toHaveValue(
      "Session"
    );
    await expect(page.getByTestId("folder-search-clear")).toBeVisible();
  });
});
