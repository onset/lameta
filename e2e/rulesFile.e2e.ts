import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { launchWithProject } from "./various-e2e-helpers";

// The archive's rules file runs in a separate hidden window (mainProcess/rulesSandbox.ts).
// These tests go through that real path: the main process, the sandbox and back.

let lameta: LametaE2ERunner;
let page: Page;

test.describe("Rules file", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    await launchWithProject(lameta, "RulesFile", "ELAR");
    page = lameta.page;
    // View > Show Problems
    await lameta.electronApp.evaluate(({ Menu }) => {
      const view = Menu.getApplicationMenu()!.items.find(
        (i) => i.label.replace("&", "") === "View",
      );
      view!.submenu!.items.find((i) => i.label === "Show Problems")!.click();
    });
    await page.getByTestId("problems-sidebar").waitFor({ state: "visible", timeout: 10000 });
  });
  test.afterAll(async () => {
    await lameta.quit();
  });

  test("ELAR's built-in rules file reports a problem", async () => {
    // the project's name has spaces, which ELAR does not allow in a corpus folder name
    await expect(
      page
        .getByTestId("problem-entry")
        .and(page.locator("[data-check-id='checkCorpusFolderName']")),
    ).toBeVisible({ timeout: 15000 });
  });
});
