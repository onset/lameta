import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as Path from "path";
import PO from "pofile";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { launchWithProject } from "./various-e2e-helpers";

// the translation of an English text in one of the catalogs in locale/<folder>
function translation(folder: string, catalog: string, english: string) {
  const po = PO.parse(
    fs.readFileSync(
      Path.join(process.cwd(), "locale", folder, `${catalog}.po`),
      "utf8"
    )
  );
  return po.items.find((item) => item.msgid === english)?.msgstr[0] ?? "";
}

const languages = [
  { menuLabel: "Español", folder: "es" },
  { menuLabel: "Portuguesa, Brasileiro", folder: "pt-BR" },
  { menuLabel: "简体中文", folder: "zh-cn" }
];

for (const { menuLabel, folder } of languages) {
  test.describe(`Interface language ${menuLabel}`, () => {
    let lameta: LametaE2ERunner;
    test.beforeAll(async () => {
      lameta = new LametaE2ERunner();
      await launchWithProject(lameta, `InterfaceLanguage ${folder}`);
    });
    test.afterAll(async () => {
      await lameta.quit();
    });

    test("shows a session's field labels and buttons in that language", async () => {
      const page = lameta.page;
      await lameta.clickMenu("View", "Interface Language", menuLabel);
      await page.getByTestId("sessions-tab").click();
      await page.getByTestId("new-session-button").click();
      await page.getByTestId("field-title-edit").waitFor();

      // the session's Title label and the Add Files button are not in English
      await expect(page.getByText("Title", { exact: true })).toHaveCount(0);
      await expect(page.getByText("Add Files", { exact: true })).toHaveCount(0);
      // they are in the catalogs' translations
      const title = translation(folder, "fields", "Title");
      const addFiles = translation(folder, "messages", "Add Files");
      await expect(
        page.getByText(title, { exact: true }).first()
      ).toBeVisible();
      await expect(
        page.getByText(addFiles, { exact: true }).first()
      ).toBeVisible();
    });
  });
}
