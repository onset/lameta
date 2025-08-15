import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { createNewProject, E2eProject } from "./e2eProject";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

// LAM-20: Highlight comment if search matches inside Contributors tab

test.describe("Folder Search Contributors Comment Highlight", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    page = await lameta.launch();
    await lameta.cancelRegistration();
    project = await createNewProject(lameta, "FolderSearchContribs/ΔContribs");
  });
  test.afterAll(async () => {
    await lameta.quit();
  });

  test("searching text in contributor comment highlights the cell", async () => {
    await project.goToSessions();
    await project.addSession();
    // select a session
    await page
      .getByRole("gridcell", { name: /New_Session/i })
      .first()
      .click();

    // Open Contributors tab
    await page.getByRole("tab", { name: /Contributors/i }).click();

    // Focus first row comment textarea and type distinctive text
    const unique = "ContribCömment Üñîq-123_测试/テスト";
    // Find the first comments cell's textarea
    const firstTextarea = page
      .getByTestId("contributor-comment-textarea")
      .first();
    await firstTextarea.waitFor({ state: "visible" });
    await firstTextarea.click();
    await firstTextarea.fill(unique);

    // Perform folder search with a substring of the comment
    const query = "Üñîq-123";
    const searchInput = page.getByTestId("folder-search-input");
    await searchInput.fill(query);
    await searchInput.press("Enter");
    await page.waitForTimeout(250);

    // Ensure we are still on Contributors
    await page.getByRole("tab", { name: /Contributors/i }).click();

    // The comment cell wrapper should have data-has-highlight=true
    const cell = page.getByTestId("contributor-comment-cell").first();
    await cell.waitFor({ state: "visible" });
    await expect(cell).toHaveAttribute("data-has-highlight", "true");

    // Optional: verify inline highlight elements exist somewhere
    await expect(page.getByTestId("inline-highlight").first()).toBeVisible();

    // Capture a screenshot for the issue
    await page.screenshot({
      path: "playwright-screenshot-issue-LAM-20.png",
      fullPage: true
    });
  });
});
