import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { createNewProject, E2eProject } from "./e2eProject";
import { FolderSearchUtilities } from "./folderSearch-utilities";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;
let searchUtils: FolderSearchUtilities;

test.describe("Person Language Search", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    page = await lameta.launch();
    await lameta.cancelRegistration();
    project = await createNewProject(lameta, "PersonLanguageSearchTest");
    searchUtils = new FolderSearchUtilities(page);
  });

  test.afterAll(async () => {
    await lameta.quit();
  });

  test("search for person language should match case-insensitively", async () => {
    // Go to people tab and add two people so search UI appears
    await project.goToPeople();
    await project.addPerson("Test Person"); // Create person with name in one step
    await project.addPerson(); // Second person without name

    // Select the first person (Test Person)
    await project.selectPerson(/Test Person/i);

    await project.addPersonLanguage("Dadi Dadi");

    // Navigate back to people list to ensure we're in the list view where search should be visible
    await project.goToPeople();

    // Now test the search functionality that was broken

    // Check if search input is available
    const isSearchVisible = await searchUtils.getSearchInput().isVisible();

    // fail
    expect(isSearchVisible).toBe(true);

    // Debug: Check how many people are visible before searching
    const allPeopleBeforeSearch = page.locator(".folderList .rt-tbody .rt-tr");
    const countBeforeSearch = await allPeopleBeforeSearch.count();

    // Debug: Check if we can see the Test Person
    const testPersonVisible = await page
      .getByRole("gridcell", { name: /Test Person/i })
      .isVisible();

    // Debug: First test if basic name search works

    await searchUtils.performSearch("Test");
    const countAfterNameSearch = await allPeopleBeforeSearch.count();
    console.log(
      `Debug: ${countAfterNameSearch} people visible after searching for 'Test'`
    );

    // Clear the search before testing language search
    await searchUtils.clearSearch();

    // Test 1: Search for "dadi"

    await searchUtils.performSearch("dadi");

    await searchUtils.expectFolderCount(1);

    // Test 2: Search for "Dadi Dadi" (full match should also work)

    await searchUtils.performSearch("Dadi Dadi");
    await searchUtils.expectFolderCount(1);

    // Test 4: Clear search and verify both people are visible
    await searchUtils.clearSearch();
    await expect(searchUtils.getSearchInput()).toHaveValue("");
    await searchUtils.expectFolderCount(2); // Should show both people
  });
});
