import { Page, expect } from "@playwright/test";
import { E2eProject } from "./various-e2e-helpers";

export class ContributorsHelper {
  private page: Page;
  private project: E2eProject;

  constructor(page: Page, project: E2eProject) {
    this.page = page;
    this.project = project;
  }

  /**
   * Navigate to the Contributors tab of the current session
   */
  async goToContributorsTab() {
    await this.project.goToContributorsOfThisSession();
    // Wait for the contributors table to be visible
    await this.page.locator(".contributors").waitFor({ state: "visible" });
  }

  /**
   * Get the number of contributor rows (excluding the blank row for new entries)
   */
  async getContributorCount(): Promise<number> {
    const rows = await this.page.locator(".contributors .rt-tr-group").count();
    // The last row is always the blank row for adding new contributors
    return Math.max(0, rows - 1);
  }

  /**
   * Add a new contributor by typing a name
   * @param name The name to type for the new contributor
   * @param createNew If true, creates a new person entry; if false, selects from dropdown
   */
  async addContributor(name: string, createNew: boolean = true) {
    // Find the last (blank) row's PersonChooser
    const personChoosers = this.page.locator(".PersonChooser");
    const lastChooser = personChoosers.last();
    await lastChooser.click();
    
    // Type the name
    await this.page.keyboard.type(name);
    
    if (createNew) {
      // Press Enter to create a new person with this name
      await this.page.keyboard.press("Enter");
    } else {
      // Wait for dropdown and select the matching option
      await this.page.waitForTimeout(300);
      await this.page.getByRole("option", { name: new RegExp(name, "i") }).first().click();
    }
    
    // Wait for the UI to update
    await this.page.waitForTimeout(200);
  }

  /**
   * Select a contributor from the dropdown by name pattern
   * @param name The name pattern to match
   * @param rowIndex The row index (0-based) to set the contributor in
   */
  async selectContributorInRow(name: string | RegExp, rowIndex: number) {
    const personChoosers = this.page.locator(".PersonChooser");
    const chooser = personChoosers.nth(rowIndex);
    await chooser.click();
    
    // Open dropdown and select
    const arrowDownKey = process.platform === "darwin" ? "Meta+ArrowDown" : "Control+ArrowDown";
    await this.page.keyboard.press(arrowDownKey);
    
    await this.page.getByRole("option", { name }).first().click();
    await this.page.waitForTimeout(200);
  }

  /**
   * Set the role for a contributor row
   * @param rowIndex The row index (0-based)
   * @param roleName The role name to select (e.g., "Speaker", "Researcher", "Translator")
   */
  async setRole(rowIndex: number, roleName: string) {
    // Find the role cell in the specified row
    // ReactTable renders rows in .rt-tr-group, cells in .rt-td
    // Role is the second column (index 1)
    const rows = this.page.locator(".contributors .rt-tr-group");
    const row = rows.nth(rowIndex);
    const roleCell = row.locator(".rt-td").nth(1);
    
    await roleCell.click();
    await this.page.waitForTimeout(100);
    
    // Select the role from dropdown
    await this.page.getByRole("option", { name: roleName, exact: false }).first().click();
    await this.page.waitForTimeout(200);
  }

  /**
   * Set the comment for a contributor row
   * @param rowIndex The row index (0-based)
   * @param comment The comment text
   */
  async setComment(rowIndex: number, comment: string) {
    const textareas = this.page.locator('[data-testid="contributor-comment-textarea"]');
    const textarea = textareas.nth(rowIndex);
    
    await textarea.click();
    await textarea.fill(comment);
    await this.page.waitForTimeout(100);
  }

  /**
   * Type into the comment field character by character (useful for testing focus retention)
   * @param rowIndex The row index (0-based)
   * @param text The text to type
   */
  async typeComment(rowIndex: number, text: string) {
    const textareas = this.page.locator('[data-testid="contributor-comment-textarea"]');
    const textarea = textareas.nth(rowIndex);
    
    await textarea.click();
    // Type character by character
    for (const char of text) {
      await this.page.keyboard.type(char);
      // Small delay to simulate real typing
      await this.page.waitForTimeout(50);
    }
  }

  /**
   * Get the comment value for a contributor row
   * @param rowIndex The row index (0-based)
   */
  async getComment(rowIndex: number): Promise<string> {
    const textareas = this.page.locator('[data-testid="contributor-comment-textarea"]');
    const textarea = textareas.nth(rowIndex);
    return await textarea.inputValue();
  }

  /**
   * Delete a contributor by clicking the delete button
   * @param rowIndex The row index (0-based)
   */
  async deleteContributor(rowIndex: number) {
    const deleteButtons = this.page.locator(".deleteButton");
    const button = deleteButtons.nth(rowIndex);
    await button.click();
    await this.page.waitForTimeout(200);
  }

  /**
   * Get the displayed name of a contributor in a row
   * @param rowIndex The row index (0-based)
   */
  async getContributorName(rowIndex: number): Promise<string> {
    const personChoosers = this.page.locator(".PersonChooser");
    const chooser = personChoosers.nth(rowIndex);
    // The selected value is shown in a div with class containing "singleValue"
    const singleValue = chooser.locator('[class*="singleValue"]');
    return await singleValue.textContent() || "";
  }

  /**
   * Get the displayed role of a contributor in a row
   * @param rowIndex The row index (0-based)
   */
  async getContributorRole(rowIndex: number): Promise<string> {
    const rows = this.page.locator(".contributors .rt-tr-group");
    const row = rows.nth(rowIndex);
    // The role is in the second cell
    const roleCell = row.locator(".rt-td").nth(1);
    const singleValue = roleCell.locator('[class*="singleValue"]');
    return await singleValue.textContent() || "";
  }

  /**
   * Check if a delete button exists for a row (blank rows don't have delete buttons)
   * @param rowIndex The row index (0-based)
   */
  async hasDeleteButton(rowIndex: number): Promise<boolean> {
    const rows = this.page.locator(".contributors .rt-tr-group");
    const row = rows.nth(rowIndex);
    const deleteButton = row.locator(".deleteButton");
    return await deleteButton.count() > 0;
  }

  /**
   * Verify the comment textarea maintains focus after typing
   * @param rowIndex The row index (0-based)
   */
  async isCommentFocused(rowIndex: number): Promise<boolean> {
    const textareas = this.page.locator('[data-testid="contributor-comment-textarea"]');
    const textarea = textareas.nth(rowIndex);
    return await textarea.evaluate((el) => document.activeElement === el);
  }
}
