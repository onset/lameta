import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { createNewProject, E2eProject } from "./e2eProject";
import { E2eFileList } from "./e2eFileList";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

// LAM-25: Not finding in custom properties of JPG
// Repro: add JPG, create custom field Tools=Seismometer, search "seis".
// Expect: session selected, Properties tab highlight, inline highlight in value.

test.describe(
  "Search picks up JPG custom properties and highlights (LAM-25)",
  () => {
    test.beforeAll(async () => {
      lameta = new LametaE2ERunner();
      page = await lameta.launch();
      await lameta.cancelRegistration();
      project = await createNewProject(lameta, "LAM-25[custom jpg props]/试");
    });

    test.afterAll(async () => {
      await lameta.quit();
    });

    test("custom field value on JPG is searchable; Properties tab + inline highlight", async () => {
      // 1) Create a Session.
      await project.goToSessions();
      await project.addSession();

      // Select the new session row so files/details are visible
      await page
        .getByRole("gridcell", { name: /New_Session/i })
        .first()
        .waitFor({ state: "visible" });
      await page
        .getByRole("gridcell", { name: /New_Session/i })
        .first()
        .click();

      // 2-3) Add a dummy JPG via the file dialog helper
      const fileList = new E2eFileList(lameta, page, project.projectDirectory);
      await fileList.addFile("caldera.jpg");

      // 4) Click on the added JPG file in the file list
      const jpgCell = page
        .getByRole("gridcell", { name: /caldera\.jpg/i })
        .first();
      await jpgCell.waitFor({ state: "visible" });
      await jpgCell.click();

      // Switch to Properties tab under the file view
      await page.getByRole("tab", { name: /Properties/i }).click();

      // 5) Add a custom field named "Tools" with value "Seismometer"
      // Name: use the first textarea in the custom fields table placeholder row
      const nameTextarea = page.locator(".customFieldsTable textarea").first();
      await nameTextarea.waitFor({ state: "visible" });
      await nameTextarea.fill("Tools");
      // blur to trigger creation of the field
      await nameTextarea.blur();

      // Value: contentEditable with a stable test id based on field key
      const valueEditor = page.getByTestId("field-Tools-edit");
      await valueEditor.click();
      await page.keyboard.type("Seismometer");
      await page.keyboard.press("Enter");

      // 6) Type "seis" in the search field
      const query = "seis"; // lowercase to match normalized search
      const input = page.getByTestId("folder-search-input");
      await input.fill(query);
      await page.waitForTimeout(350); // debounce and index-rebuild settle

      // Verify that this session gets selected (one selected row)
      const selectedRow = page.locator(".folderList .rt-tr.selected");
      await expect(selectedRow).toHaveCount(1);

      // Verify that the Properties tab shows the highlight icon
      await expect(page.getByTestId("properties-tab-highlight")).toBeVisible();

      // Click Properties tab (ensure it's focused) and verify inline highlight inside Custom Fields value
      await page.getByRole("tab", { name: /Properties/i }).click();
      await expect(page.getByTestId("inline-highlight").first()).toBeVisible();

      // Capture a screenshot to document the behavior for the issue
      await page.screenshot({
        path: "playwright-screenshot-LAM-25.png",
        fullPage: true
      });
    });
  }
);
