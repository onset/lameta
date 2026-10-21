import fs from "fs";
import * as Path from "path";
import * as gettextParser from "gettext-parser";
import { Page, expect } from "@playwright/test";

export type CatalogName = "messages" | "fields" | "vocabularies";

// The non-English UI languages, with the label of each one in View > Interface Language.
export const uiLanguages: { code: string; menuLabel: string }[] = [
  { code: "es", menuLabel: "Español" },
  { code: "zh-CN", menuLabel: "简体中文" },
  { code: "fr", menuLabel: "Français" },
  { code: "id", menuLabel: "Bahasa Indonesia" },
  { code: "fa", menuLabel: "فارسی" },
  { code: "pt-BR", menuLabel: "Portuguesa, Brasileiro" },
  { code: "ru", menuLabel: "русский язык" },
];

// The translation of `msgid` in locale/<code>/<catalog>.po, or undefined when the catalog has
// none, or has one that is the same as the English. `context` is the msgctxt (fields.po uses
// e.g. "lameta/session/title").
export function translationOf(
  code: string,
  catalog: CatalogName,
  msgid: string,
  context = "",
): string | undefined {
  const entry = readCatalog(code, catalog)[context]?.[msgid];
  const msgstr = (entry?.msgstr ?? []).join("").trim();
  return msgstr && msgstr !== msgid ? msgstr : undefined;
}

const catalogCache = new Map<string, any>();
function readCatalog(code: string, catalog: CatalogName): Record<string, Record<string, any>> {
  const path = Path.join(__dirname, "..", "locale", code, `${catalog}.po`);
  if (!catalogCache.has(path)) {
    catalogCache.set(path, gettextParser.po.parse(fs.readFileSync(path)).translations);
  }
  return catalogCache.get(path);
}

// Clicks each visible sub-tab of the current screen in turn and calls `visit` once the tab is
// selected and its panel has rendered: its markup is not empty and was the same at two polls in a
// row. (Some panels, such as an empty Notes box, have no text to wait for.)
export async function forEachSubTab(page: Page, visit: (tabName: string) => Promise<void>) {
  const tabs = page.locator('[role="tabpanel"] [role="tab"]');
  const count = await tabs.count();
  for (let i = 0; i < count; i++) {
    const tab = tabs.nth(i);
    if (!(await tab.isVisible())) continue;
    const tabName = (await tab.textContent())?.trim() || `tab ${i + 1}`;
    await tab.click();
    await expect(tab).toHaveAttribute("aria-selected", "true");
    const panelId = await tab.getAttribute("aria-controls");
    if (panelId) {
      const panel = page.locator(`[id="${panelId}"]`);
      await expect(panel).toBeVisible();
      let previousSize = -1;
      await expect
        .poll(
          async () => {
            const size = (await panel.innerHTML()).length;
            const settled = size > 0 && size === previousSize;
            previousSize = size;
            return settled;
          },
          { intervals: [100, 200, 250] },
        )
        .toBe(true);
    }
    await visit(tabName);
  }
}

// The visible text on the page that is the English of a message that messages.po or
// fields.po translates for this language, i.e. text that should have been translated.
export async function findUntranslatedText(page: Page, code: string): Promise<string[]> {
  const translated = translatedEnglish(code);
  return (await getVisibleTexts(page)).filter((text) => translated.has(text));
}

// The text of every text node that the user can see: laid out, and not hidden or transparent,
// such as a table's loading message that stays in the page after loading.
async function getVisibleTexts(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const texts = new Set<string>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent?.trim();
      const element = node.parentElement;
      if (
        text &&
        element?.checkVisibility({ opacityProperty: true, visibilityProperty: true }) &&
        element.getClientRects().length > 0
      ) {
        texts.add(text);
      }
    }
    return [...texts];
  });
}

// Visible text on the page that is in no catalog. In the pseudo-locale every message from
// messages.po comes out with accented letters, so text that contains a Latin letter, no
// character outside ASCII, and is not the English of any catalog entry (fields.po and
// vocabularies.po have no pseudo-translations) was never sent to the catalogs, unless it
// matches `data`, such as a file name.
export async function findTextThatSkipsTheCatalogs(page: Page, data: RegExp[]): Promise<string[]> {
  const english = catalogEnglish();
  return (await getVisibleTexts(page)).filter(
    (text) =>
      /[A-Za-z]/.test(text) &&
      !/\P{ASCII}/u.test(text) &&
      !english.has(text) &&
      !data.some((d) => d.test(text)),
  );
}

let catalogEnglishCache: Set<string> | undefined;
function catalogEnglish(): Set<string> {
  if (!catalogEnglishCache) {
    catalogEnglishCache = new Set<string>();
    for (const catalog of ["messages", "fields", "vocabularies"] as CatalogName[]) {
      const translations = readCatalog("en", catalog);
      for (const context of Object.keys(translations)) {
        for (const msgid of Object.keys(translations[context])) {
          // StatusControl shows a status such as "In_Progress" with a space for the underscore
          if (msgid) catalogEnglishCache.add(msgid.trim()).add(msgid.trim().replace("_", " "));
        }
      }
    }
  }
  return catalogEnglishCache;
}

// English texts that whichever catalog the code looks them up in will translate. A page does not
// say which catalog a text came from, so a text counts only when every catalog that holds it
// translates it: in messages.po, every entry, since code looks one up by its msgctxt; in
// fields.po, any entry, since lameta looks those up by English text alone. Text that one
// catalog translates and another does not is missing translator work, not a code error.
const translatedEnglishCache = new Map<string, Set<string>>();
function translatedEnglish(code: string): Set<string> {
  if (!translatedEnglishCache.has(code)) {
    const translatedIn = { messages: new Set<string>(), fields: new Set<string>() };
    const untranslatedInMessages = new Set<string>();
    const all = new Set<string>();
    for (const catalog of ["messages", "fields"] as const) {
      const translations = readCatalog(code, catalog);
      for (const context of Object.keys(translations)) {
        for (const msgid of Object.keys(translations[context])) {
          if (!msgid) continue;
          all.add(msgid);
          if (translationOf(code, catalog, msgid, context)) translatedIn[catalog].add(msgid);
          else if (catalog === "messages") untranslatedInMessages.add(msgid);
        }
      }
    }
    const holds = (catalog: "messages" | "fields", msgid: string) =>
      Object.values(readCatalog(code, catalog)).some((entries) => msgid in entries);
    const english = new Set(
      [...all].filter(
        (msgid) =>
          !untranslatedInMessages.has(msgid) &&
          (!holds("fields", msgid) || translatedIn.fields.has(msgid)) &&
          (translatedIn.messages.has(msgid) || translatedIn.fields.has(msgid)),
      ),
    );
    translatedEnglishCache.set(code, new Set([...english].map((msgid) => msgid.trim())));
  }
  return translatedEnglishCache.get(code)!;
}

// Expects the page to show the translation of each of `englishLabels` that fields.po
// translates for this folder type, and fails if fields.po translates none of them, since
// then the test would prove nothing.
export async function expectFieldLabelsTranslated(
  page: Page,
  code: string,
  folderType: "project" | "session" | "person",
  englishLabels: { key: string; label: string }[],
) {
  const expected = englishLabels
    .map(({ key, label }) => translationOf(code, "fields", label, `lameta/${folderType}/${key}`))
    .filter((t): t is string => !!t);
  expect(
    expected.length,
    `locale/${code}/fields.po translates none of the ${folderType} labels that this test looks for`,
  ).toBeGreaterThan(0);
  for (const translated of expected) {
    await expect(page.getByText(translated, { exact: true }).first()).toBeVisible();
  }
}
