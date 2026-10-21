import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { launchWithProject, E2eProject } from "./various-e2e-helpers";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

// Test for clicking in the middle of the notes area (not just top-left corner)
test.describe("Notes Tab - Click Area", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    project = await launchWithProject(lameta, "NotesTabTyping/ClickAreaTest");
    page = lameta.page;
  });

  test.afterAll(async () => {
    await lameta.quit();
  });

  test("clicking in the middle of notes area gives focus", async () => {
    await project.goToSessions();
    await project.addSession();

    await page
      .getByRole("gridcell", { name: /New_Session/i })
      .first()
      .click();

    // Open Notes tab
    await page.getByRole("tab", { name: /Notes/i }).click();

    // Wait for the notesTab container (the big white area the user sees)
    const notesTabContainer = page.locator(".notesTab");
    await notesTabContainer.waitFor({ state: "visible", timeout: 10000 });

    // Get the bounding box of the container
    const containerBox = await notesTabContainer.boundingBox();
    expect(containerBox).not.toBeNull();

    // Click in the middle of the container (simulating what a user would naturally do)
    const middleX = containerBox!.x + containerBox!.width / 2;
    const middleY = containerBox!.y + containerBox!.height / 2;
    await page.mouse.click(middleX, middleY);

    // Verify focus was set to the editor
    const isFocused = await page.evaluate(() => {
      const activeElement = document.activeElement;
      const notesEditor = document.querySelector(
        '[data-testid="field-notes-edit"]'
      );
      return (
        notesEditor?.contains(activeElement) || activeElement === notesEditor
      );
    });
    expect(isFocused).toBe(true);

    // Now type and verify it works
    await page.keyboard.type("Middle click works!");
    const notesEditor = page.getByTestId("field-notes-edit");
    await expect(notesEditor).toContainText("Middle click works!");
  });
});
