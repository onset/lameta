import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { createNewProject, E2eProject } from "./e2eProject";
import { E2eFileList } from "./e2eFileList";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

test.describe("Folder Search UI", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    page = await lameta.launch();
    await lameta.cancelRegistration();
    project = await createNewProject(lameta, "FolderSearch[weird ✓ name]/测试");
  });
  test.afterAll(async () => {
    await lameta.quit();
  });

  async function expectSearchUiPresent() {
    await expect(page.getByTestId("folder-search-input")).toBeVisible();
    // subtle icon (no button yet because empty)
    await expect(page.getByTestId("folder-search-icon")).toBeVisible();
  }

  test("sessions tab search field typing enter and clearing", async () => {
    await project.goToSessions();
    // add a couple sessions to filter
    await project.addSession();
    await project.addSession();
    await expectSearchUiPresent();
    const input = page.getByTestId("folder-search-input");
    await input.click();
    await input.fill("alpha βeta / quirky ✨");
    // now should have a button (same element as icon but wrapped in button) and a clear X
    await expect(page.getByTestId("folder-search-button")).toBeVisible();
    await expect(page.getByTestId("folder-search-clear")).toBeVisible();
    // press enter to trigger search
    await input.press("Enter");
    // data attribute should reflect last search
    await expect(page.getByTestId("folder-search-bar")).toHaveAttribute(
      "data-last-search",
      "alpha βeta / quirky ✨"
    );
    // click clear
    await page.getByTestId("folder-search-clear").click();
    await expect(input).toHaveValue("");
    // icon (non-button) should be back
    await expect(page.getByTestId("folder-search-icon")).toBeVisible();

    // now actually test filtering: search for 'Session' should match all sessions
    await input.fill("Session"); // live filtering now
    // expect at least one gridcell with id containing New_Session
    const matchingCells = page.getByRole("gridcell", { name: /New_Session/i });
    await expect(matchingCells.first()).toBeVisible();
    // now search for nonsense; we only verify the search registered (result count may be 0 depending on app state)
    await input.fill("ZZZZ_NO_MATCH_§§");
    await expect(page.getByTestId("folder-search-bar")).toHaveAttribute(
      "data-last-search",
      "ZZZZ_NO_MATCH_§§"
    );
    // clear again
    await page.getByTestId("folder-search-clear").click();
  });

  test("people tab search field independent state", async () => {
    await project.goToPeople();
    await expectSearchUiPresent();
    const input = page.getByTestId("folder-search-input");
    await input.click();
    await input.type("Person XYZ ???");
    await expect(page.getByTestId("folder-search-button")).toBeVisible(); // button still shows because non-empty
    await expect(page.getByTestId("folder-search-bar")).toHaveAttribute(
      "data-last-search",
      "Person XYZ ???"
    );
  });

  test("search term persists visually across tab switch (sessions -> project -> sessions)", async () => {
    await project.goToSessions();
    // Ensure at least one session exists for a stable filtered view
    await project.addSession();
    const input = page.getByTestId("folder-search-input");
    const query = "PersistMe123 Ω";
    await input.fill(query);
    await page.waitForTimeout(200); // allow debounce
    // Verify filter recorded
    await expect(page.getByTestId("folder-search-bar")).toHaveAttribute(
      "data-last-search",
      query
    );
    // Switch to Project tab
    await project.goToProjectConfiguration();
    // Switch back to Sessions
    await project.goToSessions();
    // Input should still show the query and clear button present
    await expect(page.getByTestId("folder-search-input")).toHaveValue(query);
    await expect(page.getByTestId("folder-search-clear")).toBeVisible();
  });

  test("search matches on file names (e.g. mp3)", async () => {
    await project.goToSessions();
    // ensure at least one session exists
    await project.addSession();
    await project.addSession();
    // wait for at least one session gridcell to appear before selecting
    await page
      .getByRole("gridcell", { name: /New_Session/i })
      .first()
      .waitFor({ state: "visible", timeout: 10000 });
    await page
      .getByRole("gridcell", { name: /New_Session/i })
      .first()
      .click();
    const fileList = new E2eFileList(lameta, page, project.projectDirectory);
    // add an mp3 file (extension important for search)
    await fileList.addFile("test audio Üŋïçødé 123.mp3");
    const input = page.getByTestId("folder-search-input");
    await input.fill("mp3");
    // wait briefly for debounce
    await page.waitForTimeout(250);
    // Expect at least one session row still visible
    const filteredRows = await page
      .locator(".folderList")
      .getByRole("row")
      .count();
    expect(filteredRows).toBeGreaterThan(1); // header + at least one data row
    // filename highlight span should exist containing mp3 (case-insensitive)
    await expect(
      page.getByTestId("inline-highlight").filter({ hasText: /mp3/i })
    ).toBeVisible();
  });

  test("search highlights a text field value", async () => {
    await project.goToSessions();
    // ensure at least one session
    await project.addSession();
    // wait for at least one data row
    await page.waitForFunction(() => {
      const rows = document.querySelectorAll('.folderList [role="row"]');
      return rows.length > 1;
    });
    const input = page.getByTestId("folder-search-input");
    await input.fill("Session");
    await page.waitForTimeout(250);
    // Expect a text field container with data-has-highlight
    const highlighted = page.locator('[data-has-highlight="true"]');
    await expect(highlighted.first()).toBeVisible();
    // Inline highlight spans should exist
    await expect(page.getByTestId("inline-highlight").first()).toBeVisible();
  });

  test("search highlight clears when query cleared", async () => {
    await project.goToSessions();
    await project.addSession();
    await page.waitForFunction(() => {
      const rows = document.querySelectorAll('.folderList [role="row"]');
      return rows.length > 1;
    });
    const input = page.getByTestId("folder-search-input");
    await input.fill("Session");
    await page.waitForTimeout(250);
    await expect(
      page.locator('[data-has-highlight="true"]').first()
    ).toBeVisible();
    // clear search
    const clearButton = page.getByTestId("folder-search-clear");
    await clearButton.click();
    await page.waitForTimeout(250);
    // no inline highlight spans should remain
    await expect(page.getByTestId("inline-highlight").first()).toHaveCount(0);
  });

  test("adding new session clears filter and selects new item", async () => {
    await project.goToSessions();
    // ensure at least one session so search has something
    await project.addSession();
    const input = page.getByTestId("folder-search-input");
    await input.fill("ZZZNonMatch123");
    await page.waitForTimeout(250);
    // filtered list should now have zero data rows (only header) or selection cleared
    const rowsBefore = await page.locator('.folderList [role="row"]').count();
    // add another session (should clear filter and show all again)
    await page.getByTestId("new-session-button").click();
    // search input should be cleared
    await expect(input).toHaveValue("");
    // selection should be on the newly added session (which contains 'New_Session')
    await expect(
      page.getByRole("gridcell", { name: /New_Session/i }).first()
    ).toBeVisible();
  });

  test("folder count and matches display", async () => {
    await project.goToSessions();
    // add a couple sessions to get a stable count
    await project.addSession();
    await project.addSession();
    const countEl = page.getByTestId("folder-count");
    // expect something like '3 Sessions'
    await expect(countEl).toContainText(/\d+\s+Sessions/);
    const input = page.getByTestId("folder-search-input");
    await input.fill("ZZZ_NO_MATCH_dont_exist");
    await page.waitForTimeout(250);
    await expect(countEl).toHaveText(/0\s+matches/);
    // clear via clear button
    await page.getByTestId("folder-search-clear").click();
    await page.waitForTimeout(150);
    await expect(countEl).toContainText(/Sessions/);
  });

  test("selecting nth filtered folder shows correct details pane", async () => {
    await project.goToSessions();
    // Ensure at least two fresh sessions
    for (let i = 0; i < 2; i++) {
      await project.addSession();
    }
    // Rename first session id to AlphaOne (initial sessions typically New_Session & New_Session1)
    const firstRow = page
      .getByRole("gridcell", { name: /^New_Session$/ })
      .first();
    await firstRow.click();
    const idField = page.getByTestId("field-id-edit");
    await idField.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("AlphaFilterTestOne");
    await page.keyboard.press("Enter");
    // wait for rename to reflect in grid (id column only)
    const alphaOneIdCell = page
      .locator(".folderList .rt-td.id")
      .filter({ hasText: /^AlphaFilterTestOne$/ });
    await expect(alphaOneIdCell).toBeVisible();
    // Rename second session id to AlphaTwo. Remaining original should be New_Session1.
    const secondRow = page
      .getByRole("gridcell", { name: /^New_Session1$/ })
      .first();
    await secondRow.click();
    await idField.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("AlphaFilterTestTwo");
    await page.keyboard.press("Enter");
    // Filter to only Alpha sessions
    const input = page.getByTestId("folder-search-input");
    await input.fill("AlphaFilterTest");
    await page.waitForTimeout(300);
    const idCells = page.locator(".folderList .rt-td.id");
    const alphaOneCell = idCells.filter({ hasText: /^AlphaFilterTestOne$/ });
    const alphaTwoCell = idCells.filter({ hasText: /^AlphaFilterTestTwo$/ });
    await expect(alphaOneCell).toBeVisible();
    await expect(alphaTwoCell).toBeVisible();
    // Click the second filtered id cell and ensure details pane shows its id
    await alphaTwoCell.click();
    await expect(idField).toHaveText(/AlphaFilterTestTwo/);
  });

  test("search matches file metadata (notes) and highlights file row", async () => {
    await project.goToSessions();
    // ensure a session exists and select it
    await project.addSession();
    await page
      .getByRole("gridcell", { name: /New_Session/i })
      .first()
      .click();
    const fileList = new E2eFileList(lameta, page, project.projectDirectory);
    await fileList.addFile("metaMatchTestAudio.mp3");
    // Open Notes tab for the file (Audio -> Properties -> Notes). The Audio tab shows first; click Notes tab label
    // Wait for tabs to render
    const notesTab = page.getByRole("tab", { name: /Notes/i });
    await notesTab.click();
    // Find the notes field editable div
    const notesEditor = page.getByTestId("field-notes-edit");
    const token = "MetaMatchΩ123";
    await notesEditor.click();
    await page.keyboard.type(token);
    await page.keyboard.press("Enter"); // blur if single-line; ensure save
    // Now search for the token at folder level
    const input = page.getByTestId("folder-search-input");
    await input.fill(token);
    await page.waitForTimeout(300);
    // Expect the file row to have metadata match border (detect via test id)
    await expect(page.getByTestId("file-metadata-match").first()).toBeVisible();
  });

  test("search highlighting: session tab highlights when built-in id matches default name", async () => {
    await project.goToSessions();
    await project.addSession();
    const cell = page.getByRole("gridcell", { name: /^New_Session$/ }).first();
    await cell.click();
    const input = page.getByTestId("folder-search-input");
    await input.fill("New_Session");
    await page.waitForTimeout(250);
    await expect(page.getByTestId("session-tab-highlight")).toBeVisible();
  });

  test("search highlighting: audio and properties tabs highlight on filename match", async () => {
    await project.goToSessions();
    await project.addSession();
    await page
      .getByRole("gridcell", { name: /New_Session/i })
      .first()
      .click();
    const fileList = new E2eFileList(lameta, page, project.projectDirectory);
    const token = "TabPropX456";
    await fileList.addFile(`media_${token}.mp3`);
    // file row may not be automatically selected; click by partial filename
    const fileCell = page
      .getByRole("gridcell", { name: new RegExp(token, "i") })
      .first();
    await fileCell.waitFor({ state: "visible" });
    await fileCell.click();
    const input = page.getByTestId("folder-search-input");
    await input.fill(token);
    await page.waitForTimeout(350);
    await expect(page.getByTestId("audio-tab-highlight")).toBeVisible();
    await expect(page.getByTestId("properties-tab-highlight")).toBeVisible();
  });

  test("notes-only match does not highlight session tab", async () => {
    await project.goToSessions();
    await project.addSession();
    // select session
    await page
      .getByRole("gridcell", { name: /^New_Session$/ })
      .first()
      .click();
    // open Notes tab
    const notesTab = page.getByRole("tab", { name: /Notes/i });
    await notesTab.click();
    const notesEditor = page.getByTestId("field-notes-edit");
    const token = "SessNotesOnlyZ99"; // unlikely to appear elsewhere
    await notesEditor.click();
    await page.keyboard.type(token);
    await page.keyboard.press("Enter");
    const input = page.getByTestId("folder-search-input");
    await input.fill(token);
    await page.waitForTimeout(300);
    // Notes tab highlighted
    await expect(page.getByTestId("notes-tab-highlight")).toBeVisible();
    // Session tab NOT highlighted (element with test id should not exist)
    await expect(page.getByTestId("session-tab-highlight")).toHaveCount(0);
  });
});
