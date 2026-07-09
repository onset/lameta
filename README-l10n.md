We use Crowdin.com for crowdsourced translation, [lingui](https://lingui.js.org/) for code strings, our own json5→po extractor for field/vocabulary strings, and a simple lookup for a few CSVs.

# The one-page picture

- **Crowdin project:** 324607 ("laMeta", identifier `saymorex`). One project, two areas:
  - **Project ROOT = lameta v2.** The `V2` branch of this repo syncs there (old layout: `messages.po` + `fields/choices/tips.csv`). **Do not upload to, change, or delete anything at the Crowdin root from V3 tooling** — v2 is still shipping.
  - **Crowdin branch `V3` = this repo.** `yarn strings:sync` uploads/downloads with `-b V3`. Exactly six files live there: `messages.po`, `fields.po`, `vocabularies.po`, `accessProtocols.csv`, `genres.csv`, `roles.csv`.
- **Duplicate sharing:** the project setting "hide duplicates" means any V3 string whose English text also exists at the root is hidden in the editor and automatically inherits the root's translation. That is how v2's translation work flows into v3 for free. It also means per-file "translated %" on Crowdin only counts *visible* strings — use `yarn tsx scripts/crowdin/report.ts V3` for the real picture.
- **Language codes and folders match**: `locale/{es,fr,ru,id,fa,pt-BR,zh-CN}/`. `crowdin.yml` has a `languages_mapping` that forces the downloads for pt-BR and zh-CN into those exact folder names (Crowdin's default two-letter scheme would produce `pt/` and `zh/` — that caused years of confusion and a runtime folder remap that has been removed).
- The English catalogs (`locale/en/*.po`) are the source of truth for what strings exist; translations live on Crowdin and are pulled into the per-language folders.

# Using Lingui in Code

Lingui is used for all the hard-coded UI elements. Use macros which lingui can find, so it can put them in the string catalog:

```xml
<Trans>Description Documents</Trans>
```

or

```xml
<Trans id="project.DescriptionDocuments">Description Documents</Trans>
```

or

```ts
import { t } from "@lingui/macro";
t`A simple string using the t macro`;
```

```ts
t`Today is ${weather}`;
```

which will appear to the translator as "Today is {weather}". I.e., without the $. See [more examples](https://lingui.js.org/ref/macro.html#examples-of-js-macros)

or

```ts
{
  this.i18n._(
    "project.DescriptionDocuments",
    {},
    { defaults: "Description Documents" }
  );
}
```

This format uses our own wrapper. Note that you still have to include the comment part for the lingui scanner to find it.

```ts
{
  translateMessage(/*i18n*/ { id: "Today is {d}", values{d:"sunny"} });
}
```

# Our own extractor for json5 files

Our `strings:extract-json` script extracts the translatable fields from all the json5 files (`archive-configurations/**/fields.json5` and `vocabularies.json5`). It creates english `.po` files (`locale/en/fields.po`, `locale/en/vocabularies.po`), which then go to Crowdin. Crowdin gives back the po files for all the languages, and `lingui compile` creates `.js` catalogs of all of them, which we load up in `localization.ts`.

# Steps to Syncing

## 1) Build the string catalog

`yarn strings:extract` reads .linguirc to know what files to include. It creates `po` files. (Order matters internally: the lingui extract runs first because it overwrites fields.po, then the json extractor.)

## 2) Sync with Crowdin

`yarn strings:sync` will send everything to the **V3 branch** and pull the translations back. You will need an environment variable LAMETA_CROWDIN_TOKEN set to your crowdin token that has permission to do uploads.

## 3) Let lingui create its js files (`messages.js`, `fields.js`, etc.)

`yarn strings:compile`

Running all three twice in a row should produce **zero git churn** — if it doesn't, something is misconfigured; check `crowdin.yml`'s `languages_mapping` first.

# Tooling in scripts/crowdin/

Run any of these with `yarn tsx scripts/crowdin/<name>.ts`. They authenticate with LAMETA_CROWDIN_TOKEN.

| script | what it does |
| --- | --- |
| `report.ts V3` (or `--root`) | read-only: files on a branch, string counts incl. hidden, per-language translated counts. Use this to see the true state — the Crowdin UI hides duplicate strings. |
| `po-stats.ts` | local: msgid / filled-msgstr counts for every `locale/*/` catalog. `--compare <dirA> <dirB>` proves dirA's translations all exist in dirB. |
| `backup.ts` | downloads EVERYTHING (TM as TMX, glossary, full builds of root+V3, every source file, per-file per-language exports, string dumps with ids/hidden flags) into `crowdin-backup/<date>/`. **Run it and commit the result before any risky Crowdin operation.** Crowdin has no undo. |
| `export-translation.ts <branch> <file> <lang>` | read-only single-file translation export with msgstr count. |
| `merge-csv-translations.ts` | one-time (2026-07, kept for reference): folded Crowdin-root CSV edits into locale/*.csv. |
| `build-recovered-translations.ts` + `crowdin-staging.yml` | one-time: recovered v2 translations into V3 by exact-English matching; only ever fills strings that are empty on the branch. |
| `delete-v3-junk.ts` | one-time: removed the three 2023 leftover CSVs from the V3 branch (dry-run by default, `--force` to delete; structurally cannot touch root files). |
| `classify-stale.ts` | one-time: proved locale/pt & locale/zh were safe to delete. |

The full story of the 2026-07 v2→v3 sort-out (what was migrated, how, and the audit trail) is in `crowdin-backup/2026-07-09/reports/`.

# Checking for new strings using pseudo localization

Under Help:Registration, make sure you are listed as a "Developer". Next, under View Menu, choose "pseudo". Things that go through lingui will show letters with lots of accents: https://i.imgur.com/Mc1dX8Y.png.

Strings in genres.json do not (yet) go through lingui, and should show with the label with "✓" appended to the English name. If you still need to add the string somewhere, it should instead be prepended with "MISSING-". Meanwhile, the console log has messages that are formatted to easy pasting into excel columns (https://i.imgur.com/EsoUHyq.png).

# Non-code Lookups in CSV

In lameta 1 and 2, we used a combination of linguijs for code strings and our own lookup in csv files for other strings (fields, genres, etc). CSV turns out to be painful both in crowdin and seeing changes in git. For lameta V3, we localize everything with po files except three surviving multilingual CSVs (`accessProtocols.csv`, `genres.csv`, `roles.csv`) whose language columns ARE the translations; they are uploaded with `import_translations: true` so edits in either place converge.

# How to add a language

1. In Crowdin:settings:translations:Target Languages, add the language. That will make it available for translation.

1. To .linguirc, add the code to `locales`. When translations come back from crowdin, that will create the directory for this locale, and this entry will cause lingui to read the correct directory.

1. Check `crowdin.yml`: if Crowdin's two-letter code for the new language differs from the code you used in .linguirc, add an override to each `languages_mapping` (this is why pt-BR and zh-CN are listed there).

1. For each csv: a) add a column for the new language b) add the language to the scheme in crowdin.yml c) in Crowdin:Content, do a "change scheme" (NOT "update"!!!!) and choose your local copy of the csv. For the new column, choose the language.

More detail on adding the language to CSVs:
First, make sure you have the latest translations into your local files.

Now you have to add the new column. By hand, add a column to top row of locale/\*.csv, using the same name and casing as Crowdin uses. Then in Crowdin:Files select each of these csv files and choose "Change Scheme" & select your local file to upload. This will open a UI in that lets you identify the new language of the column.

DANGER: Crowdin "Change Scheme" can actually remove translations as well. So first run `yarn tsx scripts/crowdin/backup.ts` and commit, then pull in any new translations before adding new languages.
If you do lose translations, they will still be in Crowdin's Translation Memory. You can apply them one by one or use the "Pre-Translation" to use the lameta TM to fill them back in. This is scary becuase the Crowdin UI does not make it clear that it will NOT use the "global TM". I tested it on a test.csv file, to ensure that it only pre-translates from the lameta TM.

For some reason, for genres.csv, the "Change scheme" tool doesn't recognize the csv nature of this file. You have to open it in Libre Office, then save as, and you can get it to add the commas at the end of the last field.

Be sure that whatever you open with notices the UTF8 encoding! If necessary, vscode `Change File Encoding` will save and explit BOM for you.

1. When the language has enough strings translated an it's time to add the language to the program, download the files from crowdin, and in `localization.ts`, add the new language code, e.g.

   `const languages = ["en", "es", "fr", "xyz"];`

1. Finally, in the menu.ts, add the new language option.
