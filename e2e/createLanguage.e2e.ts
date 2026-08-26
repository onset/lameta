import { test, expect, Page, Locator } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { launchWithProject, E2eProject } from "./various-e2e-helpers";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

// Each language that ISO 639-3 does not list gets its own code from the qaa..qtz range,
// so an archive gets a distinct 3-letter code for each one. These tests run in order and
// share one project, so the first language gets qaa, the second qab, and so on.

async function getSubjectLanguagesField(): Promise<Locator> {
  await project.goToProjectLanguages();
  const container = page
    .locator('div.field:has(label:has-text("Subject Languages")):visible')
    .first();
  await container.waitFor({ state: "visible", timeout: 10000 });
  return container;
}

// The pill shows the name, and beside it the full tag in the .isoCode span.
// The session and person forms hold native <select> elements too, so read the text of the
// open react-select menu rather than every option on the page.
async function getOpenMenuText(): Promise<string> {
  const menu = page.locator("div[class*='-menu']").first();
  await menu.waitFor({ state: "visible", timeout: 5000 });
  return await menu.innerText();
}

async function getTags(container: Locator): Promise<string[]> {
  return await container.locator(".isoCode").allTextContents();
}

async function askToCreate(container: Locator, name: string) {
  const input = container.locator('.select input[role="combobox"]').first();
  await input.click();
  await input.fill(name);
  const createOption = page
    .locator("div[class*='-menu']:visible")
    .first()
    .getByText(new RegExp("Add.*" + name)); // e.g. Add "Tolo" as an unlisted language
  await createOption.waitFor({ state: "visible", timeout: 5000 });
  await createOption.click();
  await page.locator("#unlistedLanguageCode").waitFor({ state: "visible" });
}

test.describe("Create Custom Language", () => {
  // These tests share one project and read what the earlier ones wrote.
  test.describe.configure({ mode: "serial" });
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    project = await launchWithProject(lameta, "CreateLanguageTest");
    page = lameta.page;
  });

  test.afterAll(async () => {
    await lameta.quit();
  });

  test("the first custom language gets the code qaa", async () => {
    const container = await getSubjectLanguagesField();
    await askToCreate(container, "Xyzzyfoo");

    await expect(page.locator("#unlistedLanguageName")).toHaveValue("Xyzzyfoo");
    await expect(page.locator("#unlistedLanguageCode")).toHaveValue("qaa");
    await page.locator("#unlistedLanguageOkButton").click();

    await expect(
      container.getByRole("button", { name: /Remove.*Xyzzyfoo/ })
    ).toBeVisible({ timeout: 5000 });
    expect(await getTags(container)).toContain("qaa-x-xyzzyfoo");
  });

  test("the second custom language gets the code qab", async () => {
    const container = await getSubjectLanguagesField();
    await askToCreate(container, "Plughbar");

    await expect(page.locator("#unlistedLanguageCode")).toHaveValue("qab");
    await page.locator("#unlistedLanguageOkButton").click();

    const tags = await getTags(container);
    expect(tags).toContain("qaa-x-xyzzyfoo");
    expect(tags).toContain("qab-x-plughbar");
  });

  test("a name with accents gives a legal tag and keeps the name", async () => {
    const container = await getSubjectLanguagesField();
    await askToCreate(container, "Kürbinian");
    await page.locator("#unlistedLanguageOkButton").click();

    await expect(
      container.getByRole("button", { name: /Remove.*Kürbinian/ })
    ).toBeVisible({ timeout: 5000 });
    const tags = await getTags(container);
    // BCP 47 allows 8 alphanumerics per subtag, so "Kürbinian" gives "kurbinia".
    expect(tags.some((t) => /^q[a-t][a-z]-x-kurbinia$/.test(t))).toBe(true);
  });

  test("the Enter key also opens the dialog", async () => {
    const container = await getSubjectLanguagesField();
    const input = container.locator('.select input[role="combobox"]').first();
    await input.click();
    await input.fill("Foobar");
    await page.waitForTimeout(500); // the option list loads on a 100ms debounce
    await input.press("Enter");
    await expect(page.locator("#unlistedLanguageCode")).toBeVisible({
      timeout: 5000
    });
    await page.getByRole("button", { name: "Cancel" }).click();
  });

  test("the create row offers the name the user typed", async () => {
    const container = await getSubjectLanguagesField();
    const input = container.locator('.select input[role="combobox"]').first();
    await input.click();
    await input.fill("Zonkers");
    await page.waitForTimeout(600);
    const menu = await page.locator("div[class*='-menu']").allTextContents();
    expect(menu.join(" ")).toContain('Add "Zonkers" as an unlisted language');
    await input.press("Escape");
  });

  test("typing the code of a language the project already has finds that language", async () => {
    // The user's case: the project holds qaa-x-xyzzyfoo, and they are on another language
    // field. Typing the code, and typing the name, must both give that one language.
    await project.goToProjectLanguages();
    const working = page
      .locator('div.field:has(label:has-text("Working Languages")):visible')
      .first();
    const input = working.locator('.select input[role="combobox"]').first();
    for (const typed of ["qaa", "Xyzzyfoo"]) {
      await input.click();
      await input.fill(typed);
      await page.waitForTimeout(600);
      const menu = await getOpenMenuText();
      expect(menu).toContain("Xyzzyfoo");
      expect(menu).toContain("qaa-x-xyzzyfoo");
      // No row offers the code alone, which would be a second, different language.
      expect(menu).not.toContain("Unlisted");
      await input.press("Escape");
    }
  });

  test("typing a free code from the qaa..qtz range asks for the name", async () => {
    // The user knows the code they want, such as qax, but the language still needs a name.
    const container = await getSubjectLanguagesField();
    const input = container.locator('.select input[role="combobox"]').first();
    await input.click();
    await input.fill("qax");
    await page.waitForTimeout(600);
    const menu = await getOpenMenuText();
    expect(menu).toContain("Add an unlisted language using qax");
    // No row offers the code with no name.
    expect(menu).not.toContain("[Unlisted]");
    await input.press("Enter");

    await expect(page.locator("#unlistedLanguageCode")).toHaveValue("qax");
    await expect(page.locator("#unlistedLanguageName")).toHaveValue("");
    // A language needs a name, so OK waits for one.
    await expect(page.locator("#unlistedLanguageOkButton")).toBeDisabled();
    await page.locator("#unlistedLanguageName").fill("Wobbly");
    await page.locator("#unlistedLanguageOkButton").click();

    await expect(
      container.getByRole("button", { name: /Remove.*Wobbly/ })
    ).toBeVisible({ timeout: 5000 });
    expect(await getTags(container)).toContain("qax-x-wobbly");
  });

  test("a name with a semicolon is refused", async () => {
    // The field joins its languages with a semicolon, so such a name would come back as two
    // languages, the second of them with a piece of the name as its code.
    const container = await getSubjectLanguagesField();
    await askToCreate(container, "Frobnitz");

    const nameBox = page.locator("#unlistedLanguageName");
    const okButton = page.locator("#unlistedLanguageOkButton");
    await expect(okButton).toBeEnabled();
    await nameBox.fill("Frobnitz; Splunge");
    await expect(okButton).toBeDisabled();

    await page.getByRole("button", { name: "Cancel" }).click();
    expect(
      (await getTags(container)).filter((t) => /-x-frobnitz$/.test(t))
    ).toEqual([]);
  });

  test("a code that another language already uses is refused", async () => {
    const container = await getSubjectLanguagesField();
    expect(await getTags(container)).toContain("qaa-x-xyzzyfoo");
    await askToCreate(container, "Grunthos");

    const codeBox = page.locator("#unlistedLanguageCode");
    const okButton = page.locator("#unlistedLanguageOkButton");
    await expect(okButton).toBeEnabled();

    await codeBox.fill("qaa"); // already used by Xyzzyfoo
    await expect(okButton).toBeDisabled();

    await codeBox.fill("eng"); // outside the qaa..qtz range
    await expect(okButton).toBeDisabled();

    await page.getByRole("button", { name: "Cancel" }).click();
    // Cancel adds nothing, whatever code the box held when it was pressed.
    expect(
      (await getTags(container)).filter((t) => /-x-grunthos$/.test(t))
    ).toEqual([]);
  });
});

// A second project of its own, so that these tests do not depend on the order of the ones
// above. The language field of a session, and of a person, must find a language that the
// project invented.
test.describe("Finding a language the project invented", () => {
  test.describe.configure({ mode: "serial" });
  let lameta2: LametaE2ERunner;
  let page2: Page;
  let project2: E2eProject;

  test.beforeAll(async () => {
    lameta2 = new LametaE2ERunner();
    project2 = await launchWithProject(lameta2, "FindCustomLanguageTest");
    page2 = lameta2.page;

    await project2.goToProjectLanguages();
    const container = page2
      .locator('div.field:has(label:has-text("Subject Languages")):visible')
      .first();
    const input = container.locator('.select input[role="combobox"]').first();
    await input.click();
    await input.fill("Xyzzyfoo");
    await page2
      .locator("div[class*='-menu']:visible")
      .first()
      .getByText(/Add.*Xyzzyfoo/)
      .click();
    await page2.locator("#unlistedLanguageOkButton").click();
    await page2.waitForTimeout(600);
  });

  test.afterAll(async () => {
    await lameta2.quit();
  });

  // A menu can be in the document and still be invisible, because an ancestor with
  // overflow hidden cuts it off. That happened on the Session and Person forms, where the
  // field is about 33 pixels high and the menu is about 300 pixels high. Read the geometry,
  // not only the text.
  async function expectNothingClipsTheMenu() {
    const clippers = await page2.evaluate(() => {
      const menu = document.querySelector("div[class*='-menu']") as HTMLElement;
      if (!menu) return ["no menu in the document"];
      const menuRect = menu.getBoundingClientRect();
      const found: string[] = [];
      let element = menu.parentElement;
      while (element) {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        if (
          (style.overflowY !== "visible" || style.overflowX !== "visible") &&
          (menuRect.bottom > rect.bottom || menuRect.top < rect.top)
        )
          found.push(element.className.toString() || element.tagName);
        element = element.parentElement;
      }
      return found;
    });
    expect(clippers).toEqual([]);
  }

  async function expectMenuFinds(input: Locator, typed: string) {
    await input.click();
    await page2.waitForTimeout(300);
    // Type it, rather than filling it, so that each keystroke reaches the control.
    await input.pressSequentially(typed, { delay: 80 });
    const menu = page2.locator("div[class*='-menu']:visible").first();
    await menu.waitFor({ state: "visible", timeout: 5000 });
    await expect(menu).toContainText("Xyzzyfoo", { timeout: 5000 });
    await expect(menu).toContainText("qaa-x-xyzzyfoo");
    await expectNothingClipsTheMenu();
    // Click the row. Playwright refuses to click an element that another element covers, so
    // this is the check that the user can reach the menu. Reading its text is not.
    await menu.getByText("Xyzzyfoo").first().click();
    await page2.waitForTimeout(400);
  }

  // Take the language back out of a field that holds several, so that the next search offers
  // it again. react-select does not offer what the field already holds.
  async function removeThePill(field: Locator) {
    const pill = field.getByRole("button", { name: /Remove.*Xyzzyfoo/ });
    await expect(pill).toBeVisible({ timeout: 5000 });
    await pill.click();
    await expect(pill).toHaveCount(0, { timeout: 5000 });
  }

  test("a new session already holds the project's language", async () => {
    await project2.goToSessions();
    await project2.addSession();
    await page2.waitForTimeout(1200);
    const subject = page2
      .locator('div.field:has(label:has-text("Subject Languages")):visible')
      .first();
    // A new session takes the project's subject languages, so the language is already there.
    expect(await subject.locator(".isoCode").allTextContents()).toContain(
      "qaa-x-xyzzyfoo"
    );
  });

  test("a session finds it by code and by name", async () => {
    await project2.goToSessions();
    await page2.waitForTimeout(600);
    // Use Working Languages, which is empty. The Subject Languages of a new session already
    // holds this language, and a field does not offer what it already has.
    const working = page2
      .locator('div.field:has(label:has-text("Working Languages")):visible')
      .first();
    const input = working.locator('.select input[role="combobox"]').first();
    for (const typed of ["qaa", "Xyzzy"]) {
      await expectMenuFinds(input, typed);
      // The click put the language in the field, which is what the user is after.
      expect(await working.locator(".isoCode").allTextContents()).toContain(
        "qaa-x-xyzzyfoo"
      );
      await removeThePill(working);
    }
  });

  test("a person finds it by code and by name", async () => {
    await project2.goToPeople();
    await project2.addPerson("Language Prober");
    await page2.waitForTimeout(1200);
    // The person's language rows are SingleLanguageChooser, under class "language-name".
    const field = page2.locator(".language-name:visible").first();
    const input = field.locator('input[role="combobox"]').first();
    for (const typed of ["qaa", "Xyzzy"]) {
      await expectMenuFinds(input, typed);
      // One language per row here, so the click replaces whatever was there.
      await expect(field).toContainText("Xyzzyfoo", { timeout: 5000 });
    }
  });
});
