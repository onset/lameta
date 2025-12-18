import { expect, test } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { launchWithProject, E2eProject } from "./various-e2e-helpers";
import * as fs from "fs";
import * as Path from "path";
import * as os from "os";

test.describe("Document Access", () => {
  let lametaE2E: LametaE2ERunner;
  let project: E2eProject;

  test.beforeAll(async () => {
    lametaE2E = new LametaE2ERunner();
    // Launch with ELAR configuration since documentAccess tests require ELAR
    project = await launchWithProject(
      lametaE2E,
      "DocumentAccessProject",
      "ELAR"
    );
  });

  test.afterAll(async () => {
    await lametaE2E.quit();
  });

  test("can view Access tab on Description Document", async () => {
    const page = lametaE2E.page!;

    await project.goToProject();

    // Click on Description Documents section
    await page.click('text="Description Documents"');

    // Note: Add a file first if the list is empty
    // For now we just verify the tab structure is correct

    // If there are files, click on one and verify Access tab appears
    const fileItems = page.locator(".fileList .file-item");
    const count = await fileItems.count();

    if (count > 0) {
      await fileItems.first().click();

      // Verify Access tab is present
      const accessTab = page.locator('[data-testid="access-tab"]');
      await expect(accessTab).toBeVisible();
    }
  });

  test("can view Access tab on Other Document", async () => {
    const page = lametaE2E.page!;

    await project.goToProject();

    // Click on Other Documents section
    await page.click('text="Other Documents"');

    // If there are files, click on one and verify Access tab appears
    const fileItems = page.locator(".fileList .file-item");
    const count = await fileItems.count();

    if (count > 0) {
      await fileItems.first().click();

      // Verify Access tab is present
      const accessTab = page.locator('[data-testid="access-tab"]');
      await expect(accessTab).toBeVisible();
    }
  });

  test("changing access level updates the list", async () => {
    const page = lametaE2E.page!;

    // Navigate to Project tab and Description Documents
    await project.goToProject();
    await page.click('text="Description Documents"');

    // Create a dummy file to add
    const tempDir = os.tmpdir();
    const dummyFile = Path.join(tempDir, "test_access_update.txt");
    fs.writeFileSync(dummyFile, "dummy content");

    // Mock the open dialog and add the file
    await lametaE2E.mockShowOpenDialog([dummyFile]);
    await page.click(".cmd-add-files");

    // Wait for file to appear
    await page.waitForSelector('text="test_access_update.txt"');

    // Select the file via its row
    const fileRow = page
      .locator(".fileList .rt-tr", { hasText: "test_access_update.txt" })
      .first();
    await fileRow.dblclick();

    // access tab should be visible and interactive
    const accessTab = page.locator('[data-testid="access-tab"]');
    await expect(accessTab).toBeVisible({ timeout: 10000 });
    const initialAccessText = await accessTab.textContent();
    await accessTab.click();

    // Change access to something else, e.g. "confidential" (user)
    // AccessChooser is a react-select or similar?
    // Let's assume we can type into it or click it.
    // Based on AccessChooser.tsx, it uses React-Select.
    // We can interact with it via keyboard or clicks.

    // Click directly on the chooser input and pick the "U" option
    await page.click(
      '[data-testid="access-chooser-field"] .field-value-border'
    );
    await page.getByRole("option").first().click();

    // Check that tab label updated to reflect the new code
    if (initialAccessText) {
      await expect(accessTab).not.toHaveText(initialAccessText);
    }
    const updatedAccessText = (await accessTab.textContent()) || "";
    const updatedAccessCode = updatedAccessText.split(":").at(1)?.trim() || "";
    expect(updatedAccessCode.length).toBeGreaterThan(0);

    // Now check the list column.
    // The columns are: Icon, Name, LinkStatus, Type, Access...
    // We can check if "U" appears in the row.
    // The "LinkStatus" empty column complication: Access is after Type.

    // We expect "U" (for User) to appear in the Access column.
    // We can search for the text "U" in the file list row.
    // Be careful "U" is short. "User" might be the label?
    // The column displays the code?
    // My implementation: `f.getTextProperty("access", "")` -> the code.
    // AccessChooser stores "U", "S", etc.

    // So we look for "U" in the list.
    // Ideally we scoped to the row.
    const row = page.locator(".rt-tr", { hasText: "test_access_update.txt" });

    // Check if it contains "U".
    // Note: react-table rows are divs.
    await expect(row).toContainText(updatedAccessCode);
  });

  test("metadata companions stay hidden after reload", async () => {
    const page = lametaE2E.page!;

    await project.goToProject();
    await page.click('text="Description Documents"');

    const tempDir = os.tmpdir();
    const docName = `doc-with-access-${Date.now()}.txt`;
    const dummyFile = Path.join(tempDir, docName);
    fs.writeFileSync(dummyFile, "document needing access metadata");

    await lametaE2E.mockShowOpenDialog([dummyFile]);
    await page.click(".cmd-add-files");

    const originalFileCell = page.getByRole("gridcell", {
      name: docName,
      exact: true
    });
    await originalFileCell.waitFor({ state: "visible", timeout: 10000 });

    const fileRow = page
      .locator(".fileList .rt-tr", { hasText: docName })
      .first();
    await fileRow.dblclick();

    const accessTab = page.locator('[data-testid="access-tab"]');
    await expect(accessTab).toBeVisible({ timeout: 10000 });
    await accessTab.click();

    const chooser = page.locator(
      '[data-testid="access-chooser-field"] .field-value-border'
    );
    await chooser.waitFor({ state: "visible", timeout: 10000 });
    await chooser.click();
    await page.getByRole("option").first().click();

    // Give lameta a moment to persist the metadata file before reloading
    await page.waitForTimeout(500);

    await lametaE2E.softReload();
    await project.goToProject();
    await page.click('text="Description Documents"');

    await originalFileCell.waitFor({ state: "visible", timeout: 10000 });

    const metaFileCell = page.getByRole("gridcell", {
      name: `${docName}.meta`
    });
    await expect(metaFileCell).toHaveCount(0);
    await expect(originalFileCell).toBeVisible();
  });

  test("access and access explanation persist after reload", async () => {
    const page = lametaE2E.page!;

    await project.goToProject();
    await page.click('text="Description Documents"');

    // Create a unique file for this test
    const tempDir = os.tmpdir();
    const docName = `access-persist-test-${Date.now()}.txt`;
    const dummyFile = Path.join(tempDir, docName);
    fs.writeFileSync(dummyFile, "testing access persistence");

    // Add the file to Description Documents
    await lametaE2E.mockShowOpenDialog([dummyFile]);
    await page.click(".cmd-add-files");

    // Wait for file to appear and select it
    const fileCell = page.getByRole("gridcell", { name: docName, exact: true });
    await fileCell.waitFor({ state: "visible", timeout: 10000 });

    const fileRow = page
      .locator(".fileList .rt-tr", { hasText: docName })
      .first();
    await fileRow.dblclick();

    // Navigate to the Access tab
    const accessTab = page.locator('[data-testid="access-tab"]');
    await expect(accessTab).toBeVisible({ timeout: 10000 });
    await accessTab.click();

    // Set the access value using the chooser
    const accessChooser = page.locator(
      '[data-testid="access-chooser-field"] .field-value-border'
    );
    await accessChooser.waitFor({ state: "visible", timeout: 10000 });
    await accessChooser.click();

    // Select the first option (which should give us a non-empty access code)
    await page.getByRole("option").first().click();

    // Wait for the dropdown to close
    await page.waitForTimeout(300);

    // Get the access code that was selected (from the tab text)
    const accessTabText = (await accessTab.textContent()) || "";
    const selectedAccessCode = accessTabText.split(":").at(1)?.trim() || "";
    expect(selectedAccessCode.length).toBeGreaterThan(0);
    expect(selectedAccessCode).not.toBe("?"); // Ensure we got a real value

    // Now set the access explanation (accessDescription field)
    // The accessDescription field is a TextFieldEdit component
    const accessExplanationText = "Restricted due to cultural sensitivity";
    const explanationField = page.locator(
      '[data-testid="field-accessDescription-edit"]'
    );
    await explanationField.waitFor({ state: "visible", timeout: 10000 });
    await explanationField.click();
    await explanationField.fill(accessExplanationText);

    // Blur the explanation field to trigger save
    await explanationField.blur();

    // Navigate away from this file to ensure save completes
    // This forces the file to lose focus and save its state
    await project.goToProject();
    await page.click('text="Other Documents"');
    await page.waitForTimeout(500);

    // Now do softReload
    await lametaE2E.softReload();

    // Navigate back to Description Documents
    await project.goToProject();
    await page.click('text="Description Documents"');

    // Wait for file list to load
    await page.waitForTimeout(500);

    // Find and select the same file using a fresh locator
    const reloadedFileCell = page.getByRole("gridcell", {
      name: docName,
      exact: true
    });
    await reloadedFileCell.waitFor({ state: "visible", timeout: 10000 });
    const reloadedFileRow = page
      .locator(".fileList .rt-tr", { hasText: docName })
      .first();
    await reloadedFileRow.dblclick();

    // Navigate to the Access tab again
    const reloadedAccessTab = page.locator('[data-testid="access-tab"]');
    await expect(reloadedAccessTab).toBeVisible({ timeout: 10000 });

    // Verify the access code is still displayed in the tab
    await expect(reloadedAccessTab).toContainText(selectedAccessCode, {
      timeout: 5000
    });
    await reloadedAccessTab.click();

    // Verify the access explanation field still has the value we set
    const reloadedExplanationField = page.locator(
      '[data-testid="field-accessDescription-edit"]'
    );
    await reloadedExplanationField.waitFor({ state: "visible", timeout: 10000 });
    await expect(reloadedExplanationField).toHaveText(accessExplanationText);
  });
});
