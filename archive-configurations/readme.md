We are using json5 because it supports comments.
We create folders for institutions with files that customize the files under `lameta/`. We are using "lameta" here instead of "factory" or "default" because this folder name shows up as part of the `context` that translators see in Crowdin and we think "factory" and "default" would be confusing to them.

The full catalog of fields is at `lameta/fields.json5`. There will eventually be other things in here like `vocabulary.json5`.

## Checks

lameta reports problems with a project in three ways, and an archive configuration can use all three:

- **Field rules**, in `fields.json5`: rules about one field, such as `required`, `pattern`, `maxLength` or `translationRequired`.
- **lameta's checks**, turned on by name in the `checks` of `settings.json5`: checks of a whole project, such as a session that has no files, or a file name that is too long. They are written in lameta's TypeScript (`src/problems/lametaChecks.ts`), so their messages are translated and they run after each edit. `src/problems/checkSettings.ts` lists every check and the settings that it needs.
- **A rules file**, `rules.js`: the archive's own checks of the IMDI that lameta exports for it. See `src/problems/rulesFile.ts`.

Every configuration starts from the `checks` in `lameta/settings.json5`. A configuration's own `checks` add to that list: a check that it names gets the settings that it gives, over those in lameta's list, and `false` turns a check off:

```json5
checks: {
  // a check that lameta's list does not turn on, with its settings
  fileNameLength: { severity: "error", maxLength: 20 },
  // a check in lameta's list, with another severity
  languageNameVariations: { severity: "error" },
  // a check in lameta's list, turned off
  contributorWithoutConsent: false,
},
```

A check that is added to lameta's list reaches every configuration that does not turn it off. A unit test (`src/problems/checkSettings.spec.ts`) fails if a configuration names a check that does not exist, or gives a check settings of the wrong kind.

Use a rules file instead only for a check that belongs to one archive, or that is about the shape of the IMDI, such as which `Type` values a resource may have. A check that another archive could use with its own values, such as a list of allowed file extensions, belongs in lameta's checks, with the values in the archive's `settings.json5`.
