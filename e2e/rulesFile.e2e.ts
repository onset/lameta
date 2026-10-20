import { test, expect, Page } from "@playwright/test";
import * as fs from "fs";
import * as Path from "path";
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

  // The sidebar's "Use a different file…" link, which this test uses to choose the
  // looping rules file, is hidden for now.
  test.skip("a rules file that never finishes is stopped, and lameta keeps working", async () => {
    const rulesPath = Path.join(process.env.E2ERoot!, "looping-rules.js");
    fs.writeFileSync(
      rulesPath,
      `export const interfaceVersion = 1;
       export const format = "imdi";
       export function checkCorpus(doc, report) { while (true) {} }`,
    );
    // stand in for the native open dialog
    await lameta.electronApp.evaluate(({ dialog }, path) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [path],
      });
    }, rulesPath);
    await page.getByText("Use a different file…").click();
    await expect(page.getByTestId("problem-rules-file")).toContainText(
      "looping-rules.js (local file)",
    );

    // while the rules file loops, lameta still answers at once
    await page.waitForTimeout(1000);
    const start = Date.now();
    await page.getByTestId("sessions-tab").click();
    await expect(page.getByTestId("sessions-tab")).toHaveClass(/selected/, {
      timeout: 2000,
    });
    expect(Date.now() - start).toBeLessThan(2000);

    await expect(page.getByTestId("rules-file-errors")).toContainText(
      "did not finish within 10 seconds",
      { timeout: 20000 },
    );
  });
});
