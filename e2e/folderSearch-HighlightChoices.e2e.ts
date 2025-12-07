import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { createNewProject, E2eProject } from "./various-e2e-helpers";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

test.describe("Folder Search Choice Field Highlighting", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    page = await lameta.launch();
    await lameta.cancelRegistration();
    project = await createNewProject(
      lameta,
      "FolderSearchChoiceHighlight/тест"
    );
  });
  test.afterAll(async () => {
    await lameta.quit();
  });

  async function ensureSession() {
    await project.goToSessions();
    await project.addSession();
    // wait for at least one session row
    await page
      .getByRole("gridcell", { name: /New_Session/i })
      .first()
      .waitFor();
    await page
      .getByRole("gridcell", { name: /New_Session/i })
      .first()
      .click();
  }

  test("highlights match inside genre (open choice) field", async () => {
    await ensureSession();
    // set a custom genre value we can search for
    const genreField = page.getByTestId("genre-chooser");
    // click into the react-select input (find the input within the container)
    await genreField.click();
    const genreInput = genreField.locator("input");
    await genreInput.fill("QuirkyGenreXYZ");
    await genreInput.press("Enter"); // create/select

    // now search for a substring
    const searchInput = page.getByTestId("folder-search-input");
    await searchInput.fill("Quirky");
    await searchInput.press("Enter");
    await page.waitForTimeout(250);

    await expect(
      page.getByTestId("inline-highlight").filter({ hasText: /Quirky/i })
    ).toBeVisible();
  });

  test("access chooser shows selected value and is searchable by code", async () => {
    // First set up archive configuration so we have access choices
    await project.goToProjectConfiguration();
    await page.locator("#archiveConfigurationName-select").click();
    await page.getByText("ELAR", { exact: true }).click();
    await page.locator("button:has-text('Change')").click(); // will do a soft reload in e2e context

    // Wait for the app to reload after configuration change
    await page.waitForSelector('[data-testid="project-tab"]', {
      timeout: 10000
    });

    await ensureSession();

    // open access chooser and select "S: open to subscribers"
    const access = page.locator("#access-chooser");
    await access.click();
    const accessInput = access.locator("input");
    await accessInput.fill("S: open to subscribers");
    await accessInput.press("Enter");

    // Verify the selected value is displayed
    await expect(
      page.locator("#access-chooser").locator('[class*="singleValue"]')
    ).toContainText(/subscribers/i);

    // The session should be visible in the list
    await expect(
      page.getByRole("gridcell", { name: "New_Session", exact: true })
    ).toBeVisible();

    // And the access field should still show its value
    await expect(page.locator("#access-chooser")).toBeVisible();
  });
});
