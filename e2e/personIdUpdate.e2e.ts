import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { launchWithProject, E2eProject } from "./various-e2e-helpers";
import { E2eFileList } from "./FileList-e2e-helpers";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;
let fileList: E2eFileList;

/**
 * Tests for LAM-112: IdMightHaveChanged not called on name edits when sanitized name is unchanged
 *
 * Bug: When a user modifies a person's name in a way that changes the raw name value
 * but doesn't affect the sanitized folder name, `IdMightHaveChanged()` is never called.
 *
 * For example, changing "John" to "John!" should trigger IdMightHaveChanged() because
 * the ID (raw name) changed from "John" to "John!", even though the folder name stays
 * as "John" (since "!" is stripped by sanitization).
 *
 * https://linear.app/lameta/issue/LAM-112
 */
test.describe(
  "LAM-112: Person ID update when name changes with special characters",
  () => {
    test.beforeAll(async () => {
      lameta = new LametaE2ERunner();
      project = await launchWithProject(lameta, "LAM112Test");
      page = lameta.page;
      fileList = new E2eFileList(lameta, page, project.projectDirectory);
    });

    test.afterAll(async () => {
      await lameta.quit();
    });

    test("changing person name from John to John! should update contributor references in sessions", async () => {
      // Increase timeout for this test
      test.setTimeout(60000);

      // Step 1: Create a person named "John"
      await project.goToPeople();
      await project.addPerson("John");

      // Blur the name field to save
      await page.keyboard.press("Tab");
      await page.waitForTimeout(1000);

      // Verify the person was created and is visible in the list
      await expect(
        page.getByRole("gridcell", { name: "John" }).first()
      ).toBeVisible({ timeout: 5000 });

      // Step 2: Create a session and add John as a contributor
      await project.goToSessions();
      await project.addSession();

      // Wait for the session to be fully created
      await page.waitForTimeout(1000);

      await project.goToContributorsOfThisSession();
      await page.waitForTimeout(500);

      // Click on the first PersonChooser (contributor row)
      await page.locator(".PersonChooser").first().click();

      // Open the dropdown
      const arrowDownKey =
        process.platform === "darwin" ? "Meta+ArrowDown" : "Control+ArrowDown";
      await page.keyboard.press(arrowDownKey);
      await page.waitForTimeout(300);

      // Select John from the dropdown
      await page.getByRole("option", { name: "John" }).click();
      await page.waitForTimeout(500);

      // Verify John appears as a contributor
      await expect(
        page.getByRole("gridcell", { name: "John" }).first()
      ).toBeVisible({ timeout: 5000 });

      // Step 3: Go back to People and change John's name to "John!"
      await project.goToPeople();
      await page.waitForTimeout(500);

      // Select John
      await page.getByRole("gridcell", { name: "John" }).first().click();
      await page.waitForTimeout(500);

      // Find and edit the name field (contentEditable div)
      const nameField = page.locator('[role="textbox"]').first();
      await nameField.click();
      await page.waitForTimeout(200);

      // Triple-click to select all
      await nameField.click({ clickCount: 3 });
      await page.waitForTimeout(100);

      // Type the new name
      await page.keyboard.type("John!");
      await page.waitForTimeout(200);

      // Blur the field to trigger onBlur
      await page.keyboard.press("Tab");
      await page.waitForTimeout(2000);

      // Verify the person list shows the updated name
      await expect(
        page.getByRole("gridcell", { name: "John!" }).first()
      ).toBeVisible({ timeout: 10000 });

      // Wait for any saves to complete
      await page.waitForTimeout(3000);

      // Step 4: Go back to the session and verify the contributor reference was updated
      await project.goToSessions();

      // Wait for sessions tab to be fully loaded
      await page
        .getByTestId("new-session-button")
        .waitFor({ state: "visible", timeout: 10000 });
      await page.waitForTimeout(1000);

      // Select the session we created - the session should be selected already if it's the only one
      // If not, click on it
      const sessionCells = page.getByRole("gridcell", { name: /New Session/i });
      if ((await sessionCells.count()) > 0) {
        await sessionCells.first().click();
        await page.waitForTimeout(500);
      }
      await page.waitForTimeout(500);

      await project.goToContributorsOfThisSession();
      await page.waitForTimeout(500);

      // The contributor should now show "John!" (the new name)
      // If the bug exists, it would still show "John" because IdMightHaveChanged was not called
      await expect(
        page.getByRole("gridcell", { name: "John!" }).first()
      ).toBeVisible({
        timeout: 5000
      });
    });
  }
);
