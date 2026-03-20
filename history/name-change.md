# Name Change Checklist

Scope: move field-definition and form usage from "collection" toward "project" where the term is internal to Lameta. Do not rename Ro-Crate terms or external-schema terms that must stay as "collection".

## Suggested Changes

- [ ] archive-configurations/lameta/fields.json5:123,132,142,153,163,174,184 Rename form value `collection` to `project` for the project-level fields in this section.
- [ ] archive-configurations/lameta/fields.json5:140 Change englishLabel from "Collection Key" to "Project Key".
- [ ] archive-configurations/lameta/fields.json5:159 Consider renaming internal key `collectionSteward` to `projectSteward`. If we do this, keep the IMDI xmlTag and IMDI role wording unchanged.
- [ ] archive-configurations/lameta/fields.json5:169 Consider renaming internal key `collectionDeputySteward` to `projectDeputySteward`. If we do this, keep the IMDI xmlTag and IMDI role wording unchanged.
- [ ] archive-configurations/lameta/fields.json5:216 Update the comment text from "part of the Collection" to "part of the Project".
- [ ] archive-configurations/lameta/fields.json5:219,228,235,245 Rename form value `collectionLocation` to `projectLocation`.
- [ ] archive-configurations/ELAR/fields.json5:15,19 Update these override keys if the steward field keys are renamed in the base field definitions.
- [ ] archive-configurations/ELAR/fields.json5:23 Change helper text from "Collection Steward" to "Project Steward".
- [ ] src/components/project/ProjectTab.tsx:45,56 Rename collection-oriented variable and comment names such as `showCollectionTab` so the form code matches the new terminology.
- [ ] src/components/project/ProjectTab.tsx:48,213 Update `collection` form references to `project`.
- [ ] src/components/project/ProjectTab.tsx:255 Update `collectionLocation` form reference to `projectLocation`.
- [ ] src/components/project/ProjectTab.tsx:98,100,117,118,130,131,144,145 Rename CSS class names and test IDs that still contain `collection`.
- [ ] src/components/project/ProjectTab.css:49,52 Rename `.collection` and `.collectionLocation` selectors to `.project` and `.projectLocation`.

## Explicit Exclusions

- archive-configurations/lameta/fields.json5:160,165 Keep `CollectionSteward` IMDI names and comments unchanged because they are external IMDI terminology.
- archive-configurations/lameta/fields.json5:170,175 Keep `CollectionDeputySteward` IMDI names and comments unchanged because they are external IMDI terminology.
- archive-configurations/lameta/fields.json5:148 `projectDescription` has been adopted for the internal key; keep the `ProjectDescription` XML tag unchanged and preserve migration from the legacy `collectionDescription` key.
- archive-configurations/lameta/fields.json5:266,282 Keep `collectionSubjectLanguages` and `collectionWorkingLanguages` unchanged because they are directly tied to Ro-Crate mappings.
- src/components/ImdiView.tsx:302 Keep "Collection description" unchanged because it is part of IMDI-facing terminology.

## Notes

- Renaming internal keys such as `collectionSteward` or `collectionDeputySteward` will require follow-up updates outside these files, especially in IMDI-related code and tests.
- Renaming CSS class names or `data-testid` values will require corresponding test updates.
- `projectDescription` is no longer excluded from this pass; `collectionSubjectLanguages` and `collectionWorkingLanguages` still require separate follow-up because of Ro-Crate coupling.