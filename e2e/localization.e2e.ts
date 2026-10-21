import { expect, test } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { E2eProject } from "./various-e2e-helpers";
import {
  expectFieldLabelsTranslated,
  findTextThatSkipsTheCatalogs,
  findUntranslatedText,
  translationOf,
  uiLanguages,
} from "./localization-e2e-helpers";

// Expected text comes from the locale/*.po files in this checkout, so these tests check that
// the build shows the translations that the catalogs have, and do not change when the
// translators do. Run them against an installer's build with `pnpm e2e:installed` to check that
// packaging did not lose any.

const sessionLabels = [
  { key: "title", label: "Title" },
  { key: "date", label: "Date" },
  { key: "genre", label: "Genre" },
  { key: "description", label: "Description" },
  { key: "access", label: "Access" },
];
const personLabels = [
  { key: "name", label: "Full Name" },
  { key: "birthYear", label: "Birth Year" },
  { key: "ethnicGroup", label: "Ethnic Group" },
  { key: "howToContact", label: "How to Contact" },
  { key: "primaryOccupation", label: "Primary Occupation" },
];

async function launch(lameta: LametaE2ERunner, code: string, uiLanguage?: string) {
  await lameta.launch({
    projectName: `Localization ${code} ${Date.now()}`,
    env: uiLanguage ? { E2E_UI_LANGUAGE: uiLanguage } : {},
  });
  await lameta.page.getByTestId("project-tab").waitFor({ state: "visible", timeout: 15000 });
  const project = new E2eProject(lameta);
  project.projectDirectory = lameta.projectDirectory;
  return project;
}

async function expectTopLevelTabsAndMenuBarTranslated(lameta: LametaE2ERunner, code: string) {
  const tabs = [
    { testId: "project-tab", english: "Project" },
    { testId: "sessions-tab", english: "Sessions" },
    { testId: "people-tab", english: "People" },
  ];
  for (const { testId, english } of tabs) {
    const expected = translationOf(code, "messages", english);
    if (expected) {
      await expect(lameta.page.getByTestId(testId)).toHaveText(expected);
    }
  }
  const view = translationOf(code, "messages", "View");
  if (view) {
    await expect.poll(() => lameta.getApplicationMenuLabels()).toContain(view);
  }
}

test("in the pseudo-locale, every label on the main screens comes from the catalogs", async () => {
  const lameta = new LametaE2ERunner();
  const project = await launch(lameta, "ps", "ps");
  try {
    const page = lameta.page;
    // the project, session and person names that lameta makes up, file names and sizes
    const data = [
      /^Localization ps/,
      /^New_(Session|Person)$/,
      /^New Person$/,
      /\.\w+$/,
      /^\d+ [KMG]?B$/,
    ];
    const checkEveryTab = async (screen: string) => {
      const tabs = page.locator('[role="tabpanel"] [role="tab"]');
      const count = await tabs.count();
      for (let i = 0; i < count; i++) {
        const tab = tabs.nth(i);
        if (!(await tab.isVisible())) continue;
        await tab.click();
        await page.waitForTimeout(300);
        const skipped = await findTextThatSkipsTheCatalogs(page, data);
        expect.soft(skipped, `${screen}, tab ${i + 1}`).toEqual([]);
      }
    };
    await project.goToProject();
    await checkEveryTab("Project");
    await project.goToSessions();
    await project.addSession();
    await checkEveryTab("Sessions");
    await project.goToPeople();
    await project.addPerson();
    await checkEveryTab("People");
  } finally {
    await lameta.quit();
  }
});

test.describe("Localization", () => {
  for (const { code, menuLabel } of uiLanguages) {
    test.describe(`started in ${code}`, () => {
      let lameta: LametaE2ERunner;
      let project: E2eProject;

      test.beforeEach(async () => {
        lameta = new LametaE2ERunner();
        project = await launch(lameta, code, code);
      });
      test.afterEach(async () => {
        await lameta.quit();
      });

      test("the top-level tabs and the menu bar are translated", async () => {
        await expectTopLevelTabsAndMenuBarTranslated(lameta, code);
      });

      test("session and person field labels are translated", async () => {
        await project.goToSessions();
        await project.addSession();
        await expectFieldLabelsTranslated(lameta.page, code, "session", sessionLabels);

        await project.goToPeople();
        await project.addPerson();
        await expectFieldLabelsTranslated(lameta.page, code, "person", personLabels);
      });

      test("no screen shows English that the catalogs translate", async () => {
        const page = lameta.page;
        const checkEveryTab = async (screen: string) => {
          const tabs = page.locator('[role="tabpanel"] [role="tab"]');
          const count = await tabs.count();
          for (let i = 0; i < count; i++) {
            const tab = tabs.nth(i);
            if (!(await tab.isVisible())) continue;
            const tabName = (await tab.textContent())?.trim();
            await tab.click();
            await page.waitForTimeout(300);
            const untranslated = await findUntranslatedText(page, code);
            expect.soft(untranslated, `${screen} > ${tabName}`).toEqual([]);
          }
        };

        await project.goToProject();
        await checkEveryTab("Project");

        await project.goToSessions();
        await project.addSession();
        await checkEveryTab("Sessions");

        await project.goToPeople();
        await project.addPerson();
        await checkEveryTab("People");
      });
    });

    test(`switching to ${code} from the View menu translates the tabs and the menu bar`, async () => {
      const lameta = new LametaE2ERunner();
      await launch(lameta, code);
      try {
        await lameta.clickMenu("View", "Interface Language", menuLabel);
        await expectTopLevelTabsAndMenuBarTranslated(lameta, code);
      } finally {
        await lameta.quit();
      }
    });
  }
});
