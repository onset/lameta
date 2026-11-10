import { test, expect, Page, Locator } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { launchWithProject, E2eProject } from "./various-e2e-helpers";

// Under ELAR, text that the person types is put in the case that ELAR requires as
// they leave the field, and the field shows it.

// the text editor of a field on the visible form, found by the field's CSS class
function editorOf(page: Page, fieldKey: string): Locator {
  return page.locator(`.autoForm .${fieldKey} [contenteditable='true']`).first();
}

async function typeAndLeave(page: Page, fieldKey: string, text: string) {
  const editor = editorOf(page, fieldKey);
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type(text);
  await page.keyboard.press("Tab");
}

test.describe("Capitalization of typed text under ELAR", () => {
  let lameta: LametaE2ERunner;
  let page: Page;
  let project: E2eProject;

  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    project = await launchWithProject(lameta, "Capitalization", "ELAR");
    page = lameta.page;
    await project.goToSessions();
    await project.addSession();
    await page.getByRole("tab", { name: /^Session$/ }).click();
  });
  test.afterAll(async () => {
    await lameta.quit();
  });

  test("a session title gets a capital first letter and keeps its other capitals", async () => {
    await typeAndLeave(page, "title", "the hunt near Berthoud");
    await expect(editorOf(page, "title")).toHaveText("The hunt near Berthoud");
    // the session list shows the fixed title too
    await expect(
      page.locator(".folderList .rt-tbody .rt-tr", { hasText: "The hunt near Berthoud" }),
    ).toBeVisible();
  });

  test("each topic gets a capital first letter, and later words lose theirs", async () => {
    await typeAndLeave(page, "topic", "fishing, life in Berthoud, songs by FAO");
    await expect(editorOf(page, "topic")).toHaveText("Fishing, Life in berthoud, Songs by FAO");
  });

  test("a genre that the person types is put in ELAR's case", async () => {
    const chooser = page.getByTestId("genre-chooser");
    await chooser.click();
    const input = chooser.locator("input");
    // the genre that the chooser shows as chosen, not its menu or its announcements
    const chosenGenre = chooser.locator("[class*=singleValue]");
    await input.fill("songs about NASA");
    await input.press("Enter");
    await expect(chosenGenre).toHaveText("Songs about NASA");

    // picking it again from the list, after another genre, keeps its capitals
    await chooser.click();
    await input.fill("Narrative");
    await input.press("Enter");
    await expect(chosenGenre).toHaveText("Narrative");
    await chooser.click();
    await input.fill("songs about");
    await input.press("Enter");
    await expect(chosenGenre).toHaveText("Songs about NASA");
  });

  test("the fixed text is still there after going to another session and back", async () => {
    await project.addSession();
    await page.getByRole("tab", { name: /^Session$/ }).click();
    // the session list shows the fixed title too
    await page
      .locator(".folderList .rt-tbody .rt-tr", { hasText: "The hunt near Berthoud" })
      .click();
    await page.getByRole("tab", { name: /^Session$/ }).click();
    await expect(editorOf(page, "title")).toHaveText("The hunt near Berthoud");
  });
});
