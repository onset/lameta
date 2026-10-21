import { test, expect, Page, Locator } from "@playwright/test";
import * as fs from "fs";
import * as os from "os";
import * as Path from "path";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { launchWithProject, E2eProject } from "./various-e2e-helpers";

// The Problems sidebar, the problems under fields, and the Export dialog's checks,
// in a brand-new project: under ELAR, which finds problems at once, and under
// lameta's own configuration, which finds none.

// the numbers of problems and warnings that the indicator in the top bar shows
async function counts(page: Page): Promise<[number, number]> {
  const text = await page.getByTestId("problems-indicator").innerText();
  const [errors, warnings] = (text.match(/\d+/g) ?? []).map(Number);
  return [errors, warnings];
}

async function openSidebar(page: Page) {
  const sidebar = page.getByTestId("problems-sidebar");
  if (!(await sidebar.isVisible())) {
    await page.getByTestId("problems-indicator").click();
  }
  await expect(sidebar).toBeVisible();
}

async function closeSidebar(page: Page) {
  if (await page.getByTestId("problems-sidebar").isVisible()) {
    await page.getByTestId("hide-problems").click();
  }
  await expect(page.getByTestId("problems-sidebar")).toBeHidden();
}

// The sidebar's entries for one check, optionally only those at one field. These
// tests find problems by what found them, not by their wording.
function entries(page: Page, checkId: string, fieldKey?: string): Locator {
  const field = fieldKey ? `[data-field-key='${fieldKey}']` : "";
  return page.locator(`[data-testid='problem-entry'][data-check-id='${checkId}']${field}`);
}

// No message may still show a placeholder such as {archiveName}: that means its
// translation catalog lacked it or a value was not passed.
async function expectNoPlaceholders(locator: Locator) {
  for (const text of await locator.allInnerTexts()) {
    expect(text).not.toMatch(/\{\w+\}/);
  }
}

// the text editor of a field on the visible form, found by the field's CSS class
function editorOf(page: Page, fieldKey: string): Locator {
  return page
    .locator(`.autoForm .${fieldKey} [contenteditable='true'], .autoForm .${fieldKey} input`)
    .first();
}

async function openExportDialog(lameta: LametaE2ERunner, page: Page) {
  await lameta.clickMenu("File", "Export Project...");
  await expect(page.getByText("Export Project").first()).toBeVisible();
}

async function cancelExportDialog(page: Page) {
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByTestId("export-problems-summary")).toBeHidden();
}

test.describe("Problems in a brand-new ELAR project", () => {
  let lameta: LametaE2ERunner;
  let page: Page;
  let project: E2eProject;

  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    project = await launchWithProject(lameta, "Problems", "ELAR");
    page = lameta.page;
  });
  test.afterAll(async () => {
    await lameta.quit();
  });

  test("the indicator counts problems while the sidebar is closed, and opens it", async () => {
    await closeSidebar(page);
    await expect.poll(async () => (await counts(page))[0], { timeout: 15000 }).toBeGreaterThan(0);
    await page.getByTestId("problems-indicator").click();
    await expect(page.getByTestId("problems-sidebar")).toBeVisible();
    // the indicator does not move or change when the sidebar opens
    await expect(page.getByTestId("hide-problems")).toBeVisible();
  });

  test("ELAR's rules file reports the project name", async () => {
    await openSidebar(page);
    // the project's name has spaces, which ELAR does not allow
    await expect(entries(page, "checkCorpusFolderName")).toBeVisible({
      timeout: 15000,
    });
  });

  test("no problem shows a placeholder instead of a value", async () => {
    await openSidebar(page);
    await expect(entries(page, "required").first()).toBeVisible({
      timeout: 15000,
    });
    await expectNoPlaceholders(page.getByTestId("problem-entry"));
  });

  test("with English as the only metadata language, no translation is expected", async () => {
    await openSidebar(page);
    await expect(entries(page, "required").first()).toBeVisible({
      timeout: 15000,
    });
    await expect(entries(page, "translationRequired")).toHaveCount(0);
    await expect(
      page.locator("[data-testid='problem-entry'][data-check-id*='ranslation']"),
    ).toHaveCount(0);
  });

  test("a problem under a field shows only while the sidebar is open", async () => {
    await project.goToProject();
    // the Project page within the Project tab, where Title and Name are
    await page
      .getByRole("tabpanel", { name: "Project" })
      .getByRole("tab", { name: "Project", exact: true })
      .click();
    await openSidebar(page);
    await expect(page.getByTestId("field-problem").first()).toBeVisible({
      timeout: 15000,
    });
    await closeSidebar(page);
    await expect(page.getByTestId("field-problem")).toHaveCount(0);
    await openSidebar(page);
    await expect(page.getByTestId("field-problem").first()).toBeVisible();
  });

  test("clicking a problem goes to its field and highlights it until it is fixed", async () => {
    await openSidebar(page);
    const titleRequired = page
      .locator("[data-testid='problem-group'][data-folder-key='project:']")
      .locator(entries(page, "required", "title"));
    await expect(titleRequired).toBeVisible({ timeout: 15000 });
    await titleRequired.click();
    const highlighted = page.locator(".navigation-highlight");
    await expect(highlighted).toHaveCount(1);
    // the highlight is on the Title field
    expect(
      await highlighted.evaluate((e) => !!(e.closest(".title") || e.querySelector(".title"))),
    ).toBe(true);

    await editorOf(page, "title").click();
    await page.keyboard.type("Fishing at night");
    // the problem and the highlight go once the check has run again
    await expect(titleRequired).toHaveCount(0, { timeout: 10000 });
    await expect(highlighted).toHaveCount(0, { timeout: 10000 });
  });

  test("a project document with access S and no explanation is a problem that a click goes to", async () => {
    const documentPath = Path.join(
      fs.mkdtempSync(Path.join(os.tmpdir(), "problems-")),
      "restricted.txt",
    );
    fs.writeFileSync(documentPath, "x");
    await project.goToProject();
    await page.click('text="Description Documents"');
    await lameta.mockShowOpenDialog([documentPath]);
    await page.click(".cmd-add-files");
    await page.locator(".fileList .rt-tr", { hasText: "restricted.txt" }).first().click();
    await page.getByTestId("access-tab").click();
    await page.click('[data-testid="access-chooser-field"] .field-value-border');
    await page.getByRole("option").filter({ hasText: /^S\b/ }).click();

    await openSidebar(page);
    const explanationRequired = entries(page, "requiredWhen", "accessDescription").filter({
      hasText: "restricted.txt",
    });
    await expect(explanationRequired).toBeVisible({ timeout: 15000 });

    // from elsewhere, a click comes back to the document's Access Explanation
    await page.getByTestId("sessions-tab").click();
    await explanationRequired.click();
    const highlighted = page.locator(".navigation-highlight");
    await expect(highlighted).toHaveCount(1);
    await expect(highlighted).toHaveAttribute("data-field-key", "accessDescription");
  });

  test("a new session's problems are listed, and the other folders are dimmed", async () => {
    await openSidebar(page);
    await project.goToSessions();
    await project.addSession();
    const sessionGroup = page.locator("[data-testid='problem-group'][data-folder-key^='session:']");
    await expect(sessionGroup.first()).toBeVisible({ timeout: 15000 });
    await expect(sessionGroup.first().getByTestId("problem-entry").first()).toBeVisible();
    // no "Looks good" for a session that has problems
    await expect(sessionGroup.first().getByTestId("problems-looks-good")).toHaveCount(0);

    // with the mouse away from the sidebar, the project's section is dimmed
    await page.mouse.move(5, 300);
    const projectGroup = page.locator("[data-testid='problem-group'][data-folder-key='project:']");
    const opacity = (l: Locator) => l.evaluate((e) => Number(getComputedStyle(e).opacity));
    await expect.poll(() => opacity(projectGroup)).toBeLessThan(1);
    await expect.poll(() => opacity(sessionGroup.first())).toBe(1);
    // with the mouse over the list, nothing is dimmed
    await projectGroup.hover();
    await expect.poll(() => opacity(projectGroup)).toBe(1);
  });

  test("Tab goes down the left half of the session form, then the right", async () => {
    await project.goToSessions();
    const focusedField = () =>
      page.evaluate(() => {
        const keys = ["id", "date", "topic", "keyword", "title"];
        const active = document.activeElement;
        return keys.find((k) => active?.closest(`.autoForm .${k}`)) ?? "";
      });
    await editorOf(page, "id").click();
    await page.keyboard.press("Tab");
    await expect.poll(focusedField).toBe("date");

    await editorOf(page, "topic").click();
    await page.keyboard.press("Tab");
    await expect.poll(focusedField).toBe("keyword");
  });

  test("Export checks the project, opens the sidebar, and refuses IMDI while there are problems", async () => {
    await closeSidebar(page);
    await openExportDialog(lameta, page);
    await expect(page.getByTestId("export-problems-summary")).toBeVisible({
      timeout: 30000,
    });
    await expectNoPlaceholders(page.getByTestId("export-problems-summary"));
    // the checks found problems, so the sidebar is open behind the dialog
    await expect(page.getByTestId("problems-sidebar")).toBeVisible();

    const exportButton = page.getByRole("button", {
      name: "Export",
      exact: true,
    });
    await page.locator("input[value='imdi']").check();
    await expect(page.getByTestId("export-blocked")).toBeVisible();
    await expectNoPlaceholders(page.getByTestId("export-blocked"));
    await expect(exportButton).toBeDisabled();

    // ELAR blocks only IMDI and OPEX
    await page.locator("input[value='csv']").check();
    await expect(page.getByTestId("export-blocked")).toHaveCount(0);
    await expect(exportButton).toBeEnabled();

    await cancelExportDialog(page);
  });
});

test.describe("A brand-new project with no problems at all", () => {
  let lameta: LametaE2ERunner;
  let page: Page;
  let project: E2eProject;

  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    // lameta's own configuration has no field rules and no rules file
    project = await launchWithProject(lameta, "NoProblems");
    page = lameta.page;
  });
  test.afterAll(async () => {
    await lameta.quit();
  });

  test("the indicator shows no problems and no warnings, and the sidebar is empty", async () => {
    await expect.poll(() => counts(page), { timeout: 15000 }).toEqual([0, 0]);
    await openSidebar(page);
    await expect(page.getByTestId("problem-entry")).toHaveCount(0);
  });

  test("a selected session with no problems says it looks good", async () => {
    await openSidebar(page);
    await project.goToSessions();
    await project.addSession();
    const looksGood = page.getByTestId("problems-looks-good");
    await expect(looksGood).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("problem-entry")).toHaveCount(0);
    // on the Project tab, no session is selected, so there is nothing to show
    await project.goToProject();
    await expect(looksGood).toHaveCount(0);
  });

  test("Export says there are no problems, leaves the sidebar alone, and allows every format", async () => {
    await closeSidebar(page);
    await openExportDialog(lameta, page);
    const summary = page.getByTestId("export-problems-summary");
    await expect(summary).toHaveAttribute("data-problem-count", "0", {
      timeout: 30000,
    });
    await expect(page.getByTestId("problems-sidebar")).toBeHidden();
    const exportButton = page.getByRole("button", {
      name: "Export",
      exact: true,
    });
    for (const format of ["csv", "imdi"]) {
      const choice = page.locator(`input[value='${format}']`);
      if (await choice.count()) {
        await choice.check();
        await expect(exportButton).toBeEnabled();
        await expect(page.getByTestId("export-blocked")).toHaveCount(0);
      }
    }
    await cancelExportDialog(page);
  });
});
