We are using Crowdin.com for crowdsourcing translation, and combination of [lingui](https://lingui.js.org/) and a simple lookup table to use those translations.

# Lingui

Lingui is used for all the hard-coded UI elements. The idea is that you use macros which lingui can find, so it can put the in the string catalog:

```xml
<Trans>Description Documents</Trans>
```

or

```xml
<Trans id="project.DescriptionDocuments">Description Documents</Trans>
```

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
  translateMessage(/*i18n*/ { id: "Description Documents" });
}
```

# Getting translations from Crowdin

In Crowdin [lameta Settings](https://crowdin.com/project/saymorex/settings#translations), there is a "Build & Download" button. Both that and the "Download Latest" give a zip file. Note that it appears (not sure) that the "configuration" of the Settings:Files:fields.csv must be updated to contain a column for each target language. For a while, I was just getting Spanish, because there was not French column configured. However, once uploaded, the configure button disappears. So I had to remove and re-upload; then it acted like I still had French translations, but actually they were all English! Sigh....

At runtime, lingui uses javascript file, which you get by running

`yarn lingui-compile`

This creates files named `messages.js` in the language folders inside of /locale. These are covered by `.gitignore`.

# Checking for new strings using pseudo localization

Under Help:Registration, make sure you are listed as a "Developer". Next, under View Menu, choose "pseudo". Things that go through lingui will show letters with lots of accents. Strings in fields.json5 and genres.json do not go through lingui, and should show with the label with "✓" appended to the English name. If you still need to add the string somewhere, it should instead be prepended with "MISSING-". Meanwhile, the console log has messages that are formatted to easy pasting into excel columns (https://i.imgur.com/EsoUHyq.png).

# Build the string catalog

`yarn lingui-extract`

That reads .linguirc to know what files to include. This puts json files in ./locale/.

# Send new strings to Crowdin

To https://crowdin.com/project/saymorex, update the top level files in .locale and also ./locale/en/messages.po. Currently this is done manually, but in theory Crowdin could suck these in from github and then produce Pull Requests when new strings have been translated.

# Non-code Lookups in CSV

Currently we have lingui v2, and it does not have a way of extracting strings from anything but code. Since our field names and choice lists aren't in code, it can't be used (yet... maybe in lingui v3). So for now we have CSV files `locale/fields.csv` with all the field names, and `locale/choices.csv` with things like genres, statuses, etc. These are currently manually uploaded to https://crowdin.com/project/saymorex and then downloaded with the columns filled in from translations.

# How to add a language

In Crowdin:settings:translations:Target Languages, add the language.

`yarn lingui-add xyz`

`yarn lingui-extract` (note: this will fail if the program is running, including JEST. So in vscode ctrl-shift-p, "Jest: Stop Runner")

## CSVs

First, make sure you have the latest translations into your local files.

Now you have to add the new column. By hand, add a column to top row of locale/\*.csv, using the same name and casing as Crowdin uses. Then in Crowdin:Files select each of these csv files and choose "Change Scheme" & select your local file to upload. This will open a UI in that lets you identify the new language of the column.

DANGER: Crowdin "Change Scheme" can actually remove translations as well. So first pull in any new translations before adding new languages.
If you do loose translations, they will still by in Crowdin's Translation Memory. You can apply them one by one or use the "Pre-Translation" to use the lameta TM to fill them back in. This is scary becuase the Crowdin UI does not make it clear that it will NOT use the "global TM". I tested it on a test.csv file, to ensure that it only pre-translates from the lameta TM.

For some reason, for genres.csv, the "Change scheme" tool doesn't recognize the csv nature of this file. You have to open it in Libre Office, then save as, and you can get it to add the commas at the end of the last field.

Beware Excel, which doesn't notice the utf-8 marker. At all times, check on the Russian, which will become obviously wrong if something changes the encoding.

When the language has enough strings translated an it's time to add the language to the program, download the files from crowdin, and in `localization.ts`, add the new language code, e.g.

    `const languages = ["en", "es", "fr", "xyz"];`

Next, in the menu.ts, add the new language option.

# Problems

I have not found a way to get the default string out to the extracted files. I would expect

```
<Trans id="ProjectTab.OtherDocuments">Other Documents</Trans>
```

To put "Other Documents" in at least the English PO file, but no. So I can see no way that a Translator can actually translate. So for now all the ids are just the English. Sigh again...

"po" was the only format of lingui's three options that Crowdin could handle.
