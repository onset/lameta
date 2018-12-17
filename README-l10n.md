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

That reads .linguirc to know what files to include. That puts json files in ./locale/ that can then be put on https://crowdin.com/project/saymorex. Currently this is done manually, but Crowdin could suck these in from github and then produce Pull Requests when new strings have been translated.

At runtime, lingui uses javascript file, which you get by running

`yarn lingui-compile`

# Field Lookup CSV

We don't have a way to make lingui scan the fields.json file that is used for field names. Maybe that could be done... in the meantime we just have a CSV file at `locale/fields.csv` with all the field names. This is currently manually uploaded to https://crowdin.com/project/saymorex and then downloaded with the columns filled in from translations.

# Getting translations from Crowdin

(until we automate this with git PRs)

Under SayMoreX Settings, there is a "Build & Download" button. Both that and the "Download Latest" give a zip file. Note that it appears (not sure) that the "configuration" of the Settings:Files:fields.csv must be updated to contain a column for each target language. For a while, I was just getting Spanish, because there was not French column configured. However, once uploaded, the configure button disappears. So I had to remove and re-upload; then it acted like I still had French translations, but actually they were all English! Sigh....

I have not found a way to get the default string out to the extracted files. I would expect

```
<Trans id="ProjectTab.OtherDocuments">Other Documents</Trans>
```

To put "Other Documents" in at least the English PO file, but no. So I can see no way that a Translator can actually translate. So for now all the ids are just the English. Sigh again...

"po" was the only format of lingui's three options that Crowdin could handle.

# How to add a language

In Crowdin:settings:translations:Target Languages, add the language.

`yarn lingui-add xyz`

`yarn lingui-extract`

Upload the locale/xyz/messages.po file to crowdin

[TODO: how to add it to the fields.csv... I think you might have to add the column to the file, then upload it to crowdin. ]

In `l10nUtils.ts`, add "xyz", e.g.

    `const languages = ["en", "es", "fr", "xyz"];`

# How to get translations

In Crowdin:Translations:Build & Download. Take the resulting files and replace the ones in the codebase.

`yarn lingui-compile`

# Pseudo localization

I could not get lingui to make the pseudo js file following the instructions that said the name could be anything. It makes the po file, but `yarn lingui-compile` does not make the js file. If I change the name in .lingui to "ps", then I do get a js file. Note, this pseudo localization is on for the stuff that goes through lingui; i.e. not the strings in fields.json and genres.json.
