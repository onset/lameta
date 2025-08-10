import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { createNewProject, E2eProject } from "./e2eProject";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

// Tests highlighting of the Notes tab label when a search query matches inside the notes field

test.describe("Folder Search Notes Tab Highlight", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    page = await lameta.launch();
    await lameta.cancelRegistration();
    project = await createNewProject(
      lameta,
      "FolderSearchNotesTabHighlight/ΔNotes"
    );
  });
  test.afterAll(async () => {
    await lameta.quit();
  });

  test("highlights Notes tab label when match only in notes", async () => {
    await project.goToSessions();
    await project.addSession();
    // select first session row
    await page
      .getByRole("gridcell", { name: /New_Session/i })
      .first()
      .click();

    // Open Notes tab and enter distinctive notes text
    await page.getByRole("tab", { name: /Notes/i }).click();
    const unique = "UnIqNoTeStrïng ✨ ZZZ";
    const notesEditor = page.locator(
      'div[role="textbox"][contenteditable="true"]'
    );
    await notesEditor.click();
    await notesEditor.type(unique);
    // blur by focusing search input (also ensures editing ends so highlight can apply later)
    const searchInput = page.getByTestId("folder-search-input");
    await searchInput.click();

    // Search with part of the notes text
    const query = "UnIqNoTeStrïng"; // substring to search
    await searchInput.fill(query);
    await searchInput.press("Enter");
    await page.waitForTimeout(250);

    // Notes tab label should now be highlighted
    await expect(page.getByTestId("notes-tab-highlight")).toBeVisible();

    // Navigate back to Notes tab to see inline highlight inside content
    await page.getByRole("tab", { name: /Notes/i }).click();
    await expect(
      page
        .getByTestId("inline-highlight")
        .filter({ hasText: /UnIqNoTeStrïng/i })
    ).toBeVisible();
  });
});
