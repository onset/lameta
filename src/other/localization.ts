/* --------------------------------------------------------------------
  Set up the stuff handled by lingui  
  ---------------------------------------------------------------------*/
import { i18n as i18nFromLinguiCore } from "@lingui/core";
import userSettings from "./UserSettings";
import { t } from "@lingui/macro";
// tslint:disable-next-line: no-submodule-imports
import * as allPlurals from "make-plural/plurals"; // this is from lingui.

import moment from "moment";
import { FieldDefinition } from "../model/field/FieldDefinition";
import { IChoice } from "../model/field/Field";
import { loadOLACRoles } from "../model/Project/AuthorityLists/AuthorityLists";
import fs from "fs";

const languages = ["en", "es", "zh-CN", "fa", "fr", "id", "ps", "ru", "pt-BR"];
export const catalogs = {};
export let currentUILanguage: string;
// in the past we had to have our own version, with the upgrade to lingui 3
// this could probably go away.
export const i18n = i18nFromLinguiCore;

let olacRoles: IChoice[];

export function initializeLocalization() {
  currentUILanguage = userSettings.UILanguage;
  // if the language in the settings isn't one this version supports,
  // or if there was no setting for this and we have the default (empty string)
  if (languages.indexOf(currentUILanguage) < 0) {
    // See if their OS's language is one we support
    // currentUILanguage = remote.app.getLocale();
    // // Do we have a localization for that language? If not, the default is English.
    // if (languages.indexOf(currentUILanguage) < 0) {
    //   currentUILanguage = "en";
    // }
    currentUILanguage = "en"; // remote.app is currently undefined
  }
  // TODO: lingui has fallback, so maybe we should not default to English above?

  // Load plural rules for all supported languages. We don't actually do plurals, but without this we get a console error.
  languages.forEach((lang) => {
    const language = lang.split("-")[0]; // handle cases like zh-CN -> zh
    if (allPlurals[language]) {
      i18n.loadLocaleData(lang, { plurals: allPlurals[language] });
    }
  });

  setUILanguage(currentUILanguage, false);
  olacRoles = loadOLACRoles();
}

export function setUILanguage(code: string, reload: boolean = true) {
  currentUILanguage = code;
  moment.locale(currentUILanguage); // this is a global change

  // crowdin saves to "zh-cn" instead of "zh-CN", "pt" instead of "pt-BR"
  const fixes = { "pt-br": "pt", "zh-CN": "zh-cn" };
  const folder = fixes[code] || code;
  loadOneCatalog(folder, "messages"); // these come from code
  loadOneCatalog(folder, "fields"); // these come from the fields.json5 files
  loadOneCatalog(folder, "vocabularies"); // these come from the vocabularies.json5 files
  i18n.activate(code);
  userSettings.UILanguage = code;

  //if (reload) remote.getCurrentWindow().reload();
}
function loadOneCatalog(code: string, set: string) {
  const path = locateDependencyForFilesystemCall(`locale/${code}/${set}.js`);
  // if it doesn't exist
  if (!fs.existsSync(path)) {
    console.error(
      `Could not locate ${path}. If you are running the dev server, make sure you have run "yarn lingui-compile" at least once.`
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { messages } = require(path);
  i18n.load(code, messages);
}

// This is for strings that are not part of react, e.g. menus. They use this i18n variable to do localization

/* --------------------------------------------------------------------
  Handle the l10n of various data files while we wait for lingui to 
  be able to handle non-code input.
  ---------------------------------------------------------------------*/
// I didn't originally have a way of making the lingui-extract scanner scan our fields.json5, so I just extracted this csv manually,
// and it lives as a second file on Crowdin.com that has to be translated.
// These days linguijs can be given a custom scanner, so we will eventually be able to simplify things.
import roles from "../../locale/roles.csv";
import genres from "../../locale/genres.csv";
// note: accessProtocols.csv is pretty confusing because it's not the list of choices, but rather a mix
// of protocol names, choices, and choice descriptions.
import rawAccessProtocols from "../../locale/accessProtocols.csv";
import { locateDependencyForFilesystemCall } from "./locateDependency";
import { sentenceCase } from "./case";

export function translateFileType(englishTypeName: string): string {
  switch (englishTypeName) {
    case "Project":
      return i18n._(t`Project`);
    case "Session":
      return i18n._(t`Session`);
    case "Person":
      return i18n._(t`Person`);
    case "Video":
      return i18n._(t`Video`);
    case "Image":
      return i18n._(t`Image`);
    case "Audio":
      return i18n._(t`Audio`);
    default:
      return englishTypeName; // e.g. "mp3"
  }
}

export function translateFieldLabel(fieldDef: FieldDefinition): string {
  if (fieldDef === undefined) {
    return "LABEL ERROR";
  }

  return i18n._(fieldDef.englishLabel);
}

export function translateTip(tip?: string): string {
  if (!tip) return "";
  return i18n._(tip);
}
export function translateAccessProtocolLabelOrDescription(
  englishLabel: string
): { label: string; description: string } {
  // because there is an "ID" but also an "id" (for Indonesian), the loader (dsv at the moment) does this crazy thing to the ID column name
  const keyForTheIDColumn = '\ufeff"ID"';
  const labelRow = rawAccessProtocols.find((row) => row["en"] === englishLabel);
  if (!labelRow) return { label: englishLabel, description: "" };
  const choiceId = labelRow[keyForTheIDColumn];
  const descriptionRowId = choiceId + ".Description";
  const descriptionRow = rawAccessProtocols.find(
    (row) => row[keyForTheIDColumn] === descriptionRowId
  );

  let description = descriptionRow
    ? descriptionRow[currentUILanguage] || descriptionRow["en"] || ""
    : "";

  const label = labelRow[currentUILanguage] || englishLabel;

  // some of the descriptions get translated exaclty the same as the label, which is just noise, so we don't want to show them
  if (
    description.toLocaleLowerCase().trim() === label.toLocaleLowerCase().trim()
  )
    description = "";
  return { label, description };
}
export function translateChoice(choice: string): string {
  return i18n._(choice);
}

export function translateRole(role: string) {
  const roleChoice: IChoice | undefined = olacRoles.find((c) => c.id === role);

  return getMatch(roles, roleChoice?.label || role, "roles.csv");
}

export function translateGenre(genre: string) {
  return getMatch(genres, genre, "genres.csv");
}
function getMatch(
  lines: any[],
  s: string,
  fileThatShouldHaveThis: string,
  fieldName?: string
): string {
  // there is a mismatch in the plurality of the CSV's "Subject Language" and the code's "Subject Languages"
  // I'd rather fix this when we get out of using the CSV as I'm concerned about losing translations in Crowdin.
  if (s.toLowerCase().indexOf("subject language") > -1) {
    s = "Subject Languages";
  }
  const match = lines.find((f) => f.en.toLowerCase() === s.toLowerCase());

  if (currentUILanguage === "ps") {
    // do we have a column for english for this?
    if (match && match["en"]) return s + "✓";
    else {
      if (s && s.length > 0) {
        // at the moment we're not asking translators to take on translating country names, so we don't expect to find them in the locale/choices.csv file
        if (!fieldName || fieldName.toLowerCase().indexOf("country") < 0) {
          const forField = fieldName ? `for field ${fieldName}` : "";

          console.warn(
            `TODO: Add \t"${s}"\t to locale/${fileThatShouldHaveThis} ${forField}`
          );
        }
        return "MISSING-" + s;
      }
    }
  }

  // If it's English, sentence case it. I think this isn't best practice, but it's what the funder seems prefer. If
  // they reconsider, we can change it to Title Case, which would be better.
  if (currentUILanguage === "en") {
    return sentenceCase(s);
  }

  // const currentLanguageWithIndonesianFix =
  //   currentUILanguage === "id" ? "indonesian" : currentUILanguage;

  if (match && match[currentUILanguage]) {
    return match[currentUILanguage];
  }

  // for some reason, crowdin does spanish as "es-ES", but then saves it to "es", so we have this mix
  if (match && currentUILanguage === "es" && match["es-ES"]) {
    return match["es-ES"];
  }
  //console.log(`No ${currentUILanguage} translation for ${s}, "${s}"`);
  return s;
}

export function i18nUnitTestPrep() {
  i18n.loadLocaleData(i18n.locale, { plurals: (x) => "other" }); // silence i18n error  i18n.loadLocaleData(i18n.locale, { plurals: (x) => x }); // silence i18n error
}
