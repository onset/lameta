import { test, expect } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { createNewProject, E2eProject } from "./e2eProject";

let lameta: LametaE2ERunner;
let project: E2eProject;

test.describe("Export Marked Sessions", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    await lameta.launch();
    await lameta.cancelRegistration();
    // Use timestamp to ensure unique project name
    const timestamp = Date.now();
    project = await createNewProject(
      lameta,
      `ExportMarkedSessionsTest_${timestamp}`
    );
  });

  test.afterAll(async () => {
    await lameta.quit();
  });

  test("should correctly count and enable/disable marked sessions in export dialog", async () => {
    const page = lameta.page;

    // 1. Go to the sessions tab
    await project.goToSessions();

    // Make sure we have at least one session - add a few sessions
    console.log("Adding sessions...");
    await project.addSession();
    await project.addSession();
    await project.addSession();
    console.log("✓ Added 3 sessions");

    // Wait for sessions to be visible
    await expect(
      page.locator('[data-testid="new-session-button"]')
    ).toBeVisible();

    // Let's double-check how many sessions we actually have
    const initialSessionRows = page.locator(".rt-tr-group");
    const initialSessionCount = await initialSessionRows.count();
    console.log(
      `After adding sessions, found ${initialSessionCount} sessions in the table`
    );

    if (initialSessionCount === 0) {
      console.log(
        "MANUAL CHECK: Do you see any sessions in the sessions list?"
      );
      await page.pause();
    }

    // 2. Click on checkboxes to mark sessions
    // First, let's see what sessions we have and mark some of them
    const sessionRows = page.locator(".rt-tr-group");
    const sessionCount = await sessionRows.count();

    console.log(`Found ${sessionCount} sessions`);

    console.log("About to mark the first two sessions...");

    // Get the session IDs from the ID column (second cell with class rt-td.id)
    const firstSessionIdCell = sessionRows.nth(0).locator(".rt-td.id");
    const secondSessionIdCell = sessionRows.nth(1).locator(".rt-td.id");

    const firstSessionId = await firstSessionIdCell.textContent();
    const secondSessionId = await secondSessionIdCell.textContent();

    console.log(`First session ID: ${firstSessionId}`);
    console.log(`Second session ID: ${secondSessionId}`);

    // Since all checkboxes have the same data-testid, we need to use a different approach
    // Get the checkboxes by their position in each row
    const firstRowCheckbox = sessionRows
      .nth(0)
      .locator('input[type="checkbox"]');
    const secondRowCheckbox = sessionRows
      .nth(1)
      .locator('input[type="checkbox"]');

    console.log("Checking if checkboxes are visible...");
    await expect(firstRowCheckbox).toBeVisible();
    await expect(secondRowCheckbox).toBeVisible();

    console.log("Attempting to check first checkbox...");
    await firstRowCheckbox.check();

    console.log("Attempting to check second checkbox...");
    await secondRowCheckbox.check();

    // Verify they are actually checked
    await expect(firstRowCheckbox).toBeChecked();
    await expect(secondRowCheckbox).toBeChecked();

    // Pause for manual verification
    await page.pause();

    // 3. Use File menu -> Export Project
    await lameta.clickMenu("File", "Export Project...");

    // Wait for export dialog to open
    await expect(page.locator("text=Export Project")).toBeVisible();

    // 4. Check the "Choose which Sessions to export" dropdown
    const sessionDropdown = page.locator("#which-sessions-label").locator("..");
    await sessionDropdown.click();

    // Verify the marked sessions option shows correct count and is enabled
    const markedSessionsOption = page.locator('li[data-value="marked"]');

    // Should show "2 Marked Sessions" and be enabled
    await expect(markedSessionsOption).toContainText("2 Marked Sessions");
    await expect(markedSessionsOption).not.toHaveAttribute(
      "aria-disabled",
      "true"
    );

    // Close the dropdown
    await page.keyboard.press("Escape");

    // Test case: unmark all sessions and verify the option is disabled
    await page.getByRole("button", { name: "Cancel" }).click();

    // Go back to sessions and unmark all
    await project.goToSessions();

    // Get the session rows again for unchecking
    const sessionRowsForUncheck = page.locator(".rt-tr-group");

    // Uncheck using position-based selectors
    await sessionRowsForUncheck
      .nth(0)
      .locator('input[type="checkbox"]')
      .uncheck();
    await sessionRowsForUncheck
      .nth(1)
      .locator('input[type="checkbox"]')
      .uncheck();

    // Open export dialog again
    await lameta.clickMenu("File", "Export Project...");
    await expect(page.locator("text=Export Project")).toBeVisible();

    // Check dropdown again
    await sessionDropdown.click();

    // Should show "0 Marked Sessions" and be disabled
    const markedSessionsOptionZero = page.locator('li[data-value="marked"]');
    await expect(markedSessionsOptionZero).toContainText("0 Marked Sessions");
    await expect(markedSessionsOptionZero).toHaveAttribute(
      "aria-disabled",
      "true"
    );

    // Close dialog
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Cancel" }).click();
  });

  test("should update marked session count in real-time", async () => {
    const page = lameta.page;

    // Add sessions
    await project.goToSessions();
    await project.addSession();
    await project.addSession();

    // Open export dialog first with no marked sessions
    await lameta.clickMenu("File", "Export Project...");
    await expect(page.locator("text=Export Project")).toBeVisible();

    // Check initial state - should be 0 marked sessions
    const sessionDropdown = page.locator("#which-sessions-label").locator("..");
    await sessionDropdown.click();

    const markedSessionsOption = page.locator('li[data-value="marked"]');
    await expect(markedSessionsOption).toContainText("0 Marked Sessions");
    await expect(markedSessionsOption).toHaveAttribute("aria-disabled", "true");

    // Close dropdown and dialog
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Cancel" }).click();

    // Now mark a session
    const sessionRows = page.locator(".rt-tr-group");
    const firstSessionCheckbox = sessionRows
      .nth(0)
      .locator('input[type="checkbox"]');
    await firstSessionCheckbox.check();

    // Open export dialog again
    await lameta.clickMenu("File", "Export Project...");
    await expect(page.locator("text=Export Project")).toBeVisible();

    // Check that count is now updated to 1
    await sessionDropdown.click();
    await expect(markedSessionsOption).toContainText("1 Marked Sessions");
    await expect(markedSessionsOption).not.toHaveAttribute(
      "aria-disabled",
      "true"
    );

    // Close dialog
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Cancel" }).click();
  });
});
