import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { launchWithProject, E2eProject } from "./various-e2e-helpers";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

// NOTE: Electron native context menus are not directly accessible via Playwright's DOM APIs.
// Instead, we test that the context menu functionality works via keyboard shortcuts,
// which use the same underlying webContents methods (cut(), copy(), paste()) that
// our context menu uses. This validates the core functionality is working.

test.describe("Context Menu Cut/Copy/Paste - Keyboard verification", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    project = await launchWithProject(lameta, `ContextMenuTest_${Date.now()}`);
    page = lameta.page;
  });

  test.afterAll(async () => {
    await lameta.quit();
  });

  test("editable field supports copy and paste via keyboard (same underlying functionality as context menu)", async () => {
    // Go to sessions and create a new session
    await project.goToSessions();
    await project.addSession();

    // Wait for the session form to load
    await page.waitForSelector('[data-testid="field-id-edit"]', {
      timeout: 10000
    });

    // Find an editable field
    const idField = page.getByTestId("field-id-edit");

    // Type some text
    const uniqueText = `CopyPasteTest_${Date.now()}`;
    await idField.click();
    await idField.fill(uniqueText);

    // Select all text
    await idField.press("Control+a");
    await page.waitForTimeout(100);

    // Copy using keyboard
    await idField.press("Control+c");
    await page.waitForTimeout(100);

    // Clear the field
    await idField.fill("");
    await page.waitForTimeout(100);

    // Paste using keyboard
    await idField.press("Control+v");
    await page.waitForTimeout(200);

    // Verify the text was pasted
    const fieldValue = await idField.textContent();
    expect(fieldValue).toContain(uniqueText);
  });

  test("editable field supports cut via keyboard (same underlying functionality as context menu)", async () => {
    // We should already have a session from the previous test
    // Wait for the session form to load
    await page.waitForSelector('[data-testid="field-id-edit"]', {
      timeout: 10000
    });

    // Find an editable field
    const idField = page.getByTestId("field-id-edit");

    // Type some text
    const uniqueText = `CutTest_${Date.now()}`;
    await idField.click();
    await idField.fill(uniqueText);

    // Select all text
    await idField.press("Control+a");
    await page.waitForTimeout(100);

    // Cut using keyboard
    await idField.press("Control+x");
    await page.waitForTimeout(100);

    // The field should be empty now
    const fieldAfterCut = await idField.textContent();
    expect(fieldAfterCut).toBe("");

    // Paste using keyboard to verify the text was cut (not just deleted)
    await idField.press("Control+v");
    await page.waitForTimeout(200);

    // Verify the text was pasted back
    const fieldAfterPaste = await idField.textContent();
    expect(fieldAfterPaste).toContain(uniqueText);
  });

  test("editable field supports select all via keyboard (same underlying functionality as context menu)", async () => {
    // Wait for the session form to load
    await page.waitForSelector('[data-testid="field-id-edit"]', {
      timeout: 10000
    });

    // Find an editable field
    const idField = page.getByTestId("field-id-edit");

    // Type some text
    const uniqueText = `SelectAllTest_${Date.now()}`;
    await idField.click();
    await idField.fill(uniqueText);

    // Click to position cursor (deselect)
    await idField.click();
    await page.waitForTimeout(100);

    // Select all using keyboard
    await idField.press("Control+a");
    await page.waitForTimeout(100);

    // Copy the selection
    await idField.press("Control+c");
    await page.waitForTimeout(100);

    // Clear field and paste to verify select all worked
    await idField.fill("");
    await idField.press("Control+v");
    await page.waitForTimeout(200);

    const fieldValue = await idField.textContent();
    expect(fieldValue).toContain(uniqueText);
  });

  test("right-click on editable field triggers context menu (manual verification)", async () => {
    // This test just ensures right-click doesn't crash the app
    // The actual context menu is a native Electron menu that Playwright can't directly inspect
    // The menu functionality is verified via the keyboard tests above
    // and can be manually verified during development

    // Wait for the session form to load
    await page.waitForSelector('[data-testid="field-id-edit"]', {
      timeout: 10000
    });

    // Find an editable field
    const idField = page.getByTestId("field-id-edit");

    // Type some text so we have content for the context menu
    await idField.click();
    await idField.fill("Test content for context menu");

    // Select all text
    await idField.press("Control+a");
    await page.waitForTimeout(100);

    // Right-click on the field - this should trigger our context menu handler
    // The menu is native and not visible to Playwright, but we verify no crash
    await idField.click({ button: "right" });

    // Wait a moment to let the menu appear
    await page.waitForTimeout(300);

    // Dismiss the context menu by clicking elsewhere or pressing Escape
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);

    // Verify the field still has its content (no crash, app still works)
    const fieldValue = await idField.textContent();
    expect(fieldValue).toContain("Test content for context menu");
  });
});
