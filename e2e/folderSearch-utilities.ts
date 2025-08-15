import { Page, expect } from "@playwright/test";

/**
 * Utilities for folder search e2e tests - common patterns used across multiple test files
 */
export class FolderSearchUtilities {
  constructor(private page: Page) {}

  /**
   * Verifies that the search UI is present and visible
   */
  async expectSearchUiPresent() {
    await expect(this.page.getByTestId("folder-search-input")).toBeVisible();
    // subtle icon (no button yet because empty)
    await expect(this.page.getByTestId("folder-search-icon")).toBeVisible();
  }

  /**
   * Gets the search input element
   */
  getSearchInput() {
    return this.page.getByTestId("folder-search-input");
  }

  /**
   * Performs a search and waits for debounce
   * @param query The search query
   * @param waitTime How long to wait for debounce (default 300ms)
   */
  async performSearch(query: string, waitTime: number = 300) {
    const searchInput = this.getSearchInput();
    await searchInput.fill(query);
    await this.page.waitForTimeout(waitTime);
  }

  /**
   * Clears the search using the clear button and waits for the UI to settle
   */
  async clearSearch() {
    await this.page.getByTestId("folder-search-clear").click();
    // Wait for the search input to be empty (confirming the clear worked)
    await expect(this.getSearchInput()).toHaveValue("");
    // Brief wait for UI to settle after clearing
    await this.page.waitForTimeout(150);
  }

  /**
   * Verifies that the search bar shows the expected last search value
   * @param expectedQuery The expected query in data-last-search attribute
   */
  async expectLastSearch(expectedQuery: string | RegExp) {
    await expect(this.page.getByTestId("folder-search-bar")).toHaveAttribute(
      "data-last-search",
      expectedQuery
    );
  }

  /**
   * Verifies that a folder (person or session) with given name/pattern is visible in results
   * @param namePattern The name pattern to match (can be string or regex)
   * @param expectedCount Expected number of matching results (default 1)
   */
  async expectFolderVisible(
    namePattern: string | RegExp,
    expectedCount: number = 1
  ) {
    const matchingCells = this.page.getByRole("gridcell", {
      name: namePattern
    });
    await expect(matchingCells.first()).toBeVisible();
    if (expectedCount > 1) {
      await expect(matchingCells).toHaveCount(expectedCount);
    }
  }

  /**
   * Verifies that the folder list has the expected number of rows
   * @param expectedCount Expected number of rows in the folder list
   * @param timeout Timeout for the assertion (default 5000ms)
   */
  async expectFolderCount(expectedCount: number, timeout: number = 5000) {
    const folderRows = this.page.locator(".folderList .rt-tbody .rt-tr");
    await expect(folderRows).toHaveCount(expectedCount, { timeout });
  }

  /**
   * Verifies that a folder is selected (has the selected class)
   * @param shouldBeSelected Whether a folder should be selected (default true)
   */
  async expectFolderSelected(shouldBeSelected: boolean = true) {
    const selectedRow = this.page.locator(".folderList .rt-tr.selected");
    if (shouldBeSelected) {
      await expect(selectedRow).toHaveCount(1);
    } else {
      await expect(selectedRow).toHaveCount(0);
    }
  }

  /**
   * Verifies that inline highlights are visible/hidden
   * @param shouldBeVisible Whether highlights should be visible (default true)
   */
  async expectHighlightsVisible(shouldBeVisible: boolean = true) {
    const highlights = this.page.getByTestId("inline-highlight");
    if (shouldBeVisible) {
      await expect(highlights.first()).toBeVisible();
    } else {
      await expect(highlights.first()).toHaveCount(0);
    }
  }

  /**
   * Verifies the folder count display text (e.g., "3 Sessions" or "2 matches")
   * @param expectedPattern Pattern to match in the folder count text
   */
  async expectFolderCountText(expectedPattern: RegExp) {
    const countEl = this.page.getByTestId("folder-count");
    await expect(countEl).toHaveText(expectedPattern);
  }

  /**
   * Clicks on a folder (person or session) by name pattern
   * @param namePattern The name pattern to match
   * @param index Which matching element to click (default 0 for first)
   */
  async clickFolder(namePattern: string | RegExp, index: number = 0) {
    const matchingCells = this.page.getByRole("gridcell", {
      name: namePattern
    });
    await matchingCells
      .nth(index)
      .waitFor({ state: "visible", timeout: 10000 });
    await matchingCells.nth(index).click();
  }

  /**
   * Verifies that search UI shows button and clear states correctly
   * @param hasQuery Whether there's currently a query (affects button/icon visibility)
   */
  async expectSearchButtonStates(hasQuery: boolean) {
    if (hasQuery) {
      await expect(this.page.getByTestId("folder-search-button")).toBeVisible();
      await expect(this.page.getByTestId("folder-search-clear")).toBeVisible();
    } else {
      await expect(this.page.getByTestId("folder-search-icon")).toBeVisible();
    }
  }

  /**
   * Performs a complete search test: search, verify results, clear, verify cleared
   * @param query The search query
   * @param expectedFolderCount Expected number of folders in results
   * @param folderNamePattern Pattern to verify in results (optional)
   */
  async performCompleteSearchTest(
    query: string,
    expectedFolderCount: number,
    folderNamePattern?: string | RegExp
  ) {
    // Perform search
    await this.performSearch(query);

    // Verify results
    await this.expectFolderCount(expectedFolderCount);
    if (folderNamePattern) {
      await this.expectFolderVisible(folderNamePattern);
    }

    // Verify search UI state
    await this.expectLastSearch(query);
    await this.expectSearchButtonStates(true);

    // Clear and verify
    await this.clearSearch();
    await expect(this.getSearchInput()).toHaveValue("");
    await this.expectSearchButtonStates(false);
  }
}
