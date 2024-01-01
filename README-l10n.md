We are using Crowdin.com for crowdsourcing translation, and combination of [lingui](https://lingui.js.org/) and a simple lookup table to use those translations.

# Using Lingui in Code

Lingui is used for all the hard-coded UI elements. The idea is that you use macros which lingui can find, so it can put the in the string catalog:

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

Our `extractFromJSON.ts` file extracts the translatable fields from all the json5 files (currently just "configurations/<theconfig>/fields.json5"). It creates english `.po` files, which then go to crowdin. Crowdin gives back all the po files for all the languages, and `lingui compile` creates `.js` catalogs of all of them, which we load up in `localization.ts`.

# Steps to Syncing

## 1) Build the string catalog

`yarn strings:extract` reads .linguirc to know what files to include. It creates `po` files.

## 2) Sync with Crowdin

`yarn strings:sync` will send everything and pull the translations from Crowdin. You will need an environment variable LAMETA_CROWDIN_TOKEN set to your crowdin token that has permission to do uploads.

## 3) Let lingui create its js files (`messages.js`, `fields.js`, etc.)

`yarn strings:compile`

# Checking for new strings using pseudo localization

Under Help:Registration, make sure you are listed as a "Developer". Next, under View Menu, choose "pseudo". Things that go through lingui will show letters with lots of accents: https://i.imgur.com/Mc1dX8Y.png.

Strings in genres.json do not (yet) go through lingui, and should show with the label with "✓" appended to the English name. If you still need to add the string somewhere, it should instead be prepended with "MISSING-". Meanwhile, the console log has messages that are formatted to easy pasting into excel columns (https://i.imgur.com/EsoUHyq.png).

# Non-code Lookups in CSV

In lameta 1 and 2, we used a combination of linguijs for code strings and our own lookup in csv files for other strings (fields, genres, etc). CSV turns out to be painful both in crowdin and seeing changes in git. For lameta V3, we are moving towards localizing everything with po files. We do our own extraction of non-code strings to po, then let linguijs "compile" to its js files and serve them at runtime.

# How to add a language

1. In Crowdin:settings:translations:Target Languages, add the language. That will make it available for translation.

1. To .linguirc, add the code to `locales`. When translations come back from crowdin, that will creat the directory for this locale, and this entry will cause lingui read the correct directory.

1. For each csv: a) add a column for the new language b) add the language to the scheme in crowdin.yml c) in Crowdin:Content, do a "change scheme" (NOT "update"!!!!) and choose your local copy of the csv. For the new column, choose the language.

More detail on adding the language to CSVs:
First, make sure you have the latest translations into your local files.

Now you have to add the new column. By hand, add a column to top row of locale/\*.csv, using the same name and casing as Crowdin uses. Then in Crowdin:Files select each of these csv files and choose "Change Scheme" & select your local file to upload. This will open a UI in that lets you identify the new language of the column.

DANGER: Crowdin "Change Scheme" can actually remove translations as well. So first pull in any new translations before adding new languages.
If you do loose translations, they will still by in Crowdin's Translation Memory. You can apply them one by one or use the "Pre-Translation" to use the lameta TM to fill them back in. This is scary becuase the Crowdin UI does not make it clear that it will NOT use the "global TM". I tested it on a test.csv file, to ensure that it only pre-translates from the lameta TM.

For some reason, for genres.csv, the "Change scheme" tool doesn't recognize the csv nature of this file. You have to open it in Libre Office, then save as, and you can get it to add the commas at the end of the last field.

Be sure that whatever you open with notices the UTF8 encoding! If necessary, vscode `Change File Encoding` will save and explit BOM for you.

1. When the language has enough strings translated an it's time to add the language to the program, download the files from crowdin, and in `localization.ts`, add the new language code, e.g.

   `const languages = ["en", "es", "fr", "xyz"];`

1. Finally, in the menu.ts, add the new language option.
