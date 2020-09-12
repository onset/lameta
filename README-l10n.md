We are using Crowdin.com for crowdsourcing translation, and combination of [lingui](https://lingui.js.org/) and a simple lookup table to use those translations.

# Lingui

Lingui is used for all the UI element that are in the code. The idea is that you use macros which lingui can find, so it can put the in the string catalog:

```xml
<Trans id="project.DescriptionDocuments">Description Documents</Trans>
```

For some reason, these forms options don't work:

```xml
<Trans>Description Documents</Trans>
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

To build the string catalog, do

`yarn lingui-extract`

That reads .linguirc to know what files to include. That puts json files in ./locale/ that can then be put on https://crowdin.com/project/lameta. Currently this is done manually, but Crowdin could suck these in from github and then produce Pull Requests when new strings have been translated.

At runtime, lingui uses javascript file, which you get by running

`yarn lingui-compile`

# Non-code Lookups in CSV

Currently we have lingui v2, and it does not have a way of extracting strings from anything but code. Since our field names and choice lists aren't in code, it can't be used (yet... maybe in lingui v3). So for now we have CSV files `locale/fields.csv` with all the field names, and `locale/choices.csv` with things like genres, statuses, etc. These are currently manually uploaded to https://crowdin.com/project/lameta and then downloaded with the columns filled in from translations.

# Getting translations from Crowdin

(until we automate this with git PRs)

Under lameta Settings, there is a "Build & Download" button. Both that and the "Download Latest" give a zip file. Note that it appears (not sure) that the "configuration" of the Settings:Files:fields.csv must be updated to contain a column for each target language. For a while, I was just getting Spanish, because there was not French column configured. However, once uploaded, the configure button disappears. So I had to remove and re-upload; then it acted like I still had French translations, but actually they were all English! Sigh....

I have not found a way to get the default string out to the extracted files. I would expect

```
<Trans id="ProjectTab.OtherDocuments">Other Documents</Trans>
```

To put "Other Documents" in at least the English PO file, but no. So I can see no way that a Translator can actually translate. So for now all the ids are just the English. Sigh again...

"po" was the only format of lingui's three options that Crowdin could handle.

# How to add a language

In Crowdin:settings:translations:Target Languages, add the language.

`yarn lingui-add xyz`

`yarn lingui-extract` (note: this will fail if the program is running)

Next, you have to, by hand, add a column to locale/\*.csv. Then in Crowdin select each of these and choose "Change Scheme", upload it, and set the column header. For some reason, for genres.csv, I also had to use libre office to add a comma to the end of each line. This was not necessary for the the other files. Beware Excel, which doesn't notice the utf-8 marker.

When the language has enough translated to add to the program, download the files from crowdin, and in `l10nUtils.ts`, add "xyz", e.g.

    `const languages = ["en", "es", "fr", "xyz"];`

And in the menu.ts, add the language options.

# How to get translations

In Crowdin:Translations:Build & Download. Take the resulting files and replace the ones in the codebase.

`yarn lingui-compile`

# Pseudo localization

Under View Menu, choose "pseudo". Things that go through lingui will show letters with lots of accents. Strings in fields.json5 and genres.json do not go through lingui, and should show with the word "pseudo" prepended to the English name.
