import { test, expect, Page } from "@playwright/test";
import * as fs from "fs";
import * as Path from "path";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { launchWithProject, E2eProject } from "./various-e2e-helpers";
import { addFile, entries, groupOf, newSession, openSidebar } from "./problems-e2e-helpers";
import { ContributorsHelper } from "./contributors-e2e-helpers";

// The checks in src/problems/lametaChecks.ts, which run for every archive
// configuration. These use lameta's own configuration, with no archive chosen.

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

test.describe("lameta's checks for every configuration", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    project = await launchWithProject(lameta, "LametaChecks");
    page = lameta.page;
  });
  test.afterAll(async () => {
    await lameta.quit();
  });

  test("a session that has no files is a problem that a click goes to, and a file fixes it", async () => {
    await newSession(project, page, "NO-FILES");
    await openSidebar(page);
    const noFiles = groupOf(page, "session:NO-FILES").locator(entries(page, "sessionWithoutFiles"));
    await expect(noFiles).toBeVisible({ timeout: 15000 });

    // from another session on the People tab, a click comes back to this session
    await newSession(project, page, "OTHER");
    await project.goToPeople();
    await noFiles.click();
    await expect(page.getByTestId("sessions-tab")).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".fileList .rt-tr", { hasText: "NO-FILES.session" })).toBeVisible();

    await addFile(lameta, page, "notes.txt");
    await expect(noFiles).toHaveCount(0, { timeout: 15000 });
  });

  test("a session that has no contributors is a problem that a click takes to its Contributors tab, and a contributor fixes it", async () => {
    await newSession(project, page, "NO-CONTRIBUTORS");
    await addFile(lameta, page, "notes.txt");
    await openSidebar(page);
    const noContributors = groupOf(page, "session:NO-CONTRIBUTORS").locator(
      entries(page, "sessionWithoutContributors", "contributions"),
    );
    await expect(noContributors).toBeVisible({ timeout: 15000 });

    await project.goToPeople();
    await noContributors.click();
    const contributorsTab = page.getByRole("tab", { name: /Contributors/i });
    await expect(contributorsTab).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".navigation-highlight")).toHaveAttribute(
      "data-field-key",
      "contributions",
    );
    await expect(page.locator(".fileList .rt-tr.selected")).toContainText(
      "NO-CONTRIBUTORS.session",
    );

    await new ContributorsHelper(page, project).addContributor("Dami Asan");
    await expect(noContributors).toHaveCount(0, { timeout: 15000 });
  });

  test("a contributor who has no consent on record is a problem that a click goes to, and a consent file fixes it", async () => {
    await project.goToPeople();
    // a name without "Consent", which in the name of the person's own file would count
    await project.addPerson("Ilse Varo");
    await page.keyboard.press("Tab");
    await openSidebar(page);
    const noConsent = entries(page, "contributorWithoutConsent");
    // a person who contributes to no session is not reported
    await expect(groupOf(page, "person:Ilse Varo").getByTestId("problems-looks-good")).toBeVisible({
      timeout: 15000,
    });
    await expect(noConsent).toHaveCount(0);

    await newSession(project, page, "WITH-CONSENT");
    const contributors = new ContributorsHelper(page, project);
    await contributors.goToContributorsTab();
    await contributors.addContributor("Ilse Varo", false);
    const personsProblem = groupOf(page, "person:Ilse Varo").locator(noConsent);
    await expect(personsProblem).toBeVisible({ timeout: 15000 });

    await personsProblem.click();
    await expect(page.getByTestId("people-tab")).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".fileList .rt-tr.selected")).toContainText(/Ilse.Varo\.person/);

    await addFile(lameta, page, "Consent.txt");
    await expect(personsProblem).toHaveCount(0, { timeout: 15000 });
  });
});

// The lameta UI cannot give one language code two names: a name that the user types is
// stored only for a language from the Add an Unlisted Language dialog, which gives it a
// code of its own. So these sessions are written to disk, as a SayMore project or a
// hand-edited file would have them, and the project is opened again.
test.describe("one language code with different names in different sessions", () => {
  let second: LametaE2ERunner;
  let secondPage: Page;
  let secondProject: E2eProject;

  test.beforeAll(async () => {
    const first = new LametaE2ERunner();
    const created = await launchWithProject(first, "LanguageNames");
    await first.quit();
    const sessions = { "LANG-A": "etr:Edolo", "LANG-B": "etr:Etoro;eng", "LANG-C": "etr:Edolo" };
    for (const [id, languages] of Object.entries(sessions)) {
      const folder = Path.join(created.projectDirectory, "Sessions", id);
      fs.mkdirSync(folder, { recursive: true });
      fs.writeFileSync(
        Path.join(folder, id + ".session"),
        `<Session><id type="string">${id}</id><languages type="string">${languages}</languages></Session>`,
      );
    }

    second = new LametaE2ERunner();
    secondPage = await second.launch({
      extraArgs: [
        Path.join(created.projectDirectory, Path.basename(created.projectDirectory) + ".sprj"),
      ],
    });
    await second.cancelRegistration();
    secondProject = Object.assign(new E2eProject(second), {
      projectDirectory: created.projectDirectory,
    });
    await secondPage.getByTestId("project-tab").waitFor({ state: "visible", timeout: 15000 });
  });
  test.afterAll(async () => {
    await second?.quit();
  });

  test("is a problem in the session with the less common name, a click goes to its languages, and removing the name fixes it", async () => {
    const page = secondPage;
    await openSidebar(page);
    const variation = entries(page, "languageNameVariations", "languages");
    await expect(variation).toHaveCount(1, { timeout: 15000 });
    await expect(groupOf(page, "session:LANG-B").locator(variation)).toBeVisible();

    await secondProject.goToPeople();
    await variation.click();
    await expect(page.getByTestId("sessions-tab")).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".fileList .rt-tr.selected")).toContainText("LANG-B.session");
    const highlighted = page.locator(".navigation-highlight");
    await expect(highlighted).toHaveAttribute("data-field-key", "languages");

    await page
      .locator("[data-field-key='languages']")
      .getByRole("button", { name: /Remove.*Etoro/i })
      .click();
    await expect(variation).toHaveCount(0, { timeout: 15000 });
  });
});
