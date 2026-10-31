import { expect, Page, Locator } from "@playwright/test";
import * as fs from "fs";
import * as os from "os";
import * as Path from "path";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { E2eProject } from "./various-e2e-helpers";

// the numbers of problems and warnings that the indicator in the top bar shows
export async function counts(page: Page): Promise<[number, number]> {
  const text = await page.getByTestId("problems-indicator").innerText();
  const [errors, warnings] = (text.match(/\d+/g) ?? []).map(Number);
  return [errors, warnings];
}

export async function openSidebar(page: Page) {
  const sidebar = page.getByTestId("problems-sidebar");
  if (!(await sidebar.isVisible())) {
    await page.getByTestId("problems-indicator").click();
  }
  await expect(sidebar).toBeVisible();
}

export async function closeSidebar(page: Page) {
  if (await page.getByTestId("problems-sidebar").isVisible()) {
    await page.getByTestId("hide-problems").click();
  }
  await expect(page.getByTestId("problems-sidebar")).toBeHidden();
}

// The sidebar's entries for one check, optionally only those at one field. These
// tests find problems by what found them, not by their wording.
export function entries(page: Page, checkId: string, fieldKey?: string): Locator {
  const field = fieldKey ? `[data-field-key='${fieldKey}']` : "";
  return page.locator(`[data-testid='problem-entry'][data-check-id='${checkId}']${field}`);
}

// the text editor of a field on the visible form, found by the field's CSS class
export function editorOf(page: Page, fieldKey: string): Locator {
  return page
    .locator(`.autoForm .${fieldKey} [contenteditable='true'], .autoForm .${fieldKey} input`)
    .first();
}

// the sidebar's section for one folder, such as "session:ETR009" or "person:Awi Heole"
export function groupOf(page: Page, folderKey: string): Locator {
  return page.locator(`[data-testid='problem-group'][data-folder-key='${folderKey}']`);
}

// adds a session and gives it `id`, so that its section in the sidebar can be found
export async function newSession(project: E2eProject, page: Page, id: string) {
  await project.goToSessions();
  await project.addSession();
  // a new session opens on the tab that the last one was on
  await page.getByRole("tab", { name: /^Session$/ }).click();
  await editorOf(page, "id").click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type(id);
  await page.keyboard.press("Tab");
  await expect(page.locator(".fileList .rt-tr", { hasText: `${id}.session` })).toBeVisible();
}

// Adds a file with this name and content to the selected session or person, through
// Add Files, and selects it. lameta may put the folder's name in front of `name`.
export async function addFile(
  lameta: LametaE2ERunner,
  page: Page,
  name: string,
  content: string | Buffer = "x",
) {
  const path = Path.join(fs.mkdtempSync(Path.join(os.tmpdir(), "problems-")), name);
  fs.writeFileSync(path, content);
  await lameta.mockShowOpenDialog([path]);
  await page.getByRole("button", { name: "Add Files" }).click();
  const row = page.locator(".fileList .rt-tr", { hasText: name }).first();
  await expect(row).toBeVisible({ timeout: 10000 });
  // a click on a file that is still being copied is ignored
  await expect(row).not.toHaveClass(/copyPending/, { timeout: 10000 });
  await row.click();
}
