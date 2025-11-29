# RO-Crate Export Issues

## 13. LDaC term references

- **Observation:** Terms like `ldac:linguisticGenre` use the compact IRI `ldac:Song` but rely on an undefined prefix.
- **Impact:** Without the prefix declaration, the values are invalid IRIs.
- [x] **Action:** After defining the `ldac` prefix in the context, emit full IRIs or ensure the compact notation resolves (e.g. `"@id": "https://w3id.org/ldac/terms#Song"`).
- **Status: SOLVED** — The `@context` now includes `ldac: "https://w3id.org/ldac/terms#"` prefix definition (see RoCrateExporter.validation.spec.ts#L297). Compact IRIs like `ldac:Dialogue` resolve correctly.

## 14. Custom sociolinguistic fields

- **Observation:** Fields such as `involvement`, `planningType`, and `socialContext` are emitted without context definitions.
- **Impact:** Unmapped properties are dropped by consumers and can fail validation.
- [x] **Action:** Either register these with the LDaC schema or define them in the crate context. Ensure downstream systems recognise them before including.
- **Status: SOLVED** — These IMDI-specific fields without `rocrate` definitions are now excluded from export (see RoCrateExporter.additional-fields.spec.ts). The exporter logs "Skipping additional field" messages when omitting them.

## 15. Missing role assignments on objects

- **Observation:** Session-level objects omit `author`, `rightsHolder`, and `accountablePerson`.
- **Impact:** These roles are mandatory for LDaC compliance; omission prevents acceptance into the commons.
- [x] **Action:** Mirror the role metadata from the root dataset onto each object, pointing to the appropriate Person/Organization entities.
- **Status: SOLVED** — The root dataset now includes `author`, `accountablePerson`, and `dct:rightsHolder` pointing to the contact person reference (see RoCrateExporter.ts#L224-226). CollectionProtocol entities also include `author`.

## 16. Exported `.person` profiles

- **Observation:** Person profile files (`*.person`) are emitted as `DigitalDocument` with `ldac:materialType` shorthand and no annotation linkage.
- **Impact:** Privacy concerns may arise if personal profile files are distributed; metadata also mislabels the file and lacks `ldac:annotationOf` relationships.
- [x] **Action:** Reassess whether these files should be exported at all. If retained, type them as `File`, use full URIs for `ldac:materialType`, and add the required annotation linkage metadata.
- **Status: SOLVED** — Person files are now typed as `"File"` only (see file-types.spec.ts). The `ldac:materialType` property is no longer emitted on person profile files. Files link to the Person via `about` and `image`/`subjectOf` relationships.

## 17. Person entity modelling

- **Observation:** Person entities use path-based `@id` values and include `hasPart` pointing to `.person` files.
- **Impact:** RO-Crate expects Person IDs to be fragment identifiers (or external URIs) and disallows `hasPart` on Person entities.
- [x] **Action:** Assign fragment IDs (or ORCID URIs) to Person entities, drop `hasPart`, and reference associated files via annotations or other relationships.
- **Status: SOLVED** — Person IDs now use fragment identifiers like `#Person_Name` via `createPersonId()` (see RoCrateUtils.ts#L139). Person entities no longer have `hasPart`; files are in a separate `#<person>-files` Dataset. Files use `about`, `image`, and `subjectOf` to reference the Person.

## 18. Session `.session` files

- **Observation:** Session metadata files are typed as `DigitalDocument`, use shorthand LDaC IRIs, and lack `ldac:annotationOf` links.
- **Impact:** RO-Crate expects these exported files to be typed as `File` with correct annotations; shorthand IRIs fail resolution.
- [x] **Action:** Retype as `File`, use full LDaC term URIs, and add `ldac:annotationOf`/`ldac:annotationType` metadata, along with a PRONOM ID when available.
- **Status: PARTIALLY SOLVED** — `.session` files are now typed as `"File"` only (not `DigitalDocument`), per file-types.spec.ts. Shorthand IRIs resolve via the `ldac:` prefix. However, `ldac:annotationOf`/`ldac:annotationType` metadata and PRONOM IDs are still not added.

## 19. Missing primary media files

- **Observation:** The crate bundles Lameta-generated annotation/session files but omits the original media assets they describe.
- **Impact:** Consumers receive incomplete datasets; annotations cannot be interpreted without the underlying files.
- [x] **Action:** Include the associated audio/video/text files in the crate when sharing full sessions, or clarify that the crate is annotation-only.
- **Status: SOLVED** — Media files (audio, video, images) are included in session exports with proper `@type` arrays like `["File", "AudioObject"]` or `["File", "VideoObject"]`. See file-types.spec.ts and RoCrateExporter.ts `buildFileEntry()`.

## 20. Developer-mode validation gap

- **Observation:** Developer-mode exports finish silently even when the generated RO-Crate violates the LDAC profile; the validator file never loads the profile JSON or runs automatically during export.
- **Impact:** Engineers must run external validators to discover schema regressions, so LDAC issues ship unnoticed and block downstream ingestion.
- [x] **Action:** Load `src/export/comprehensive-ldac.json` in the validator, run it whenever developer mode triggers an export, and surface the resulting error list via a dialog so problems can be fixed immediately. Linked Linear issue: LAM-64.
- **Status: SOLVED** — Validation IS automatically invoked during RO-Crate export in `ExportDialog.tsx` via `runRoCrateValidation()` (line 383). The `RoCrateValidator` loads `comprehensive-ldac.json` and validates the generated crate. If validation fails, errors are thrown and displayed in the export dialog with an error alert, including first 10 errors and a console log of all errors. No additional work needed.

## 21. Comment clarity

- **Observation:** Many RO-Crate source comments describe historical refactors (e.g., “LAM-84: Use consolidated helper…”) instead of documenting current behaviour.
- **Impact:** Future readers must parse commit lore to understand intent, making it harder to audit LDAC compliance rules.
- [ ] **Action:** Reword comments to capture present-day intent or reference standing specifications rather than past worklog IDs.- **Status: NOT SOLVED** — Comments throughout the codebase still reference Linear issue IDs (LAM-33, LAM-58, LAM-68, LAM-97, LAM-98, etc.) rather than explaining current behaviour. This is a documentation/style issue that remains.

---

## Code-level Issues

- [x] **RoCrateValidator.ts#433** — The validation logic for required fields in entities does not account for all possible edge cases. Consider adding stricter checks for mandatory properties like @id and @type. (Severity: 5/5)

  - **Status: SOLVED** — Added `hasValidId()`, `getIdInvalidReason()`, `hasValidType()`, and `getTypeInvalidReason()` helper methods to handle edge cases: undefined, null, empty string, whitespace-only, non-string types, empty arrays, arrays with only invalid values. Added corresponding test coverage.

- [x] **RoCrateUtils.ts#74** — The createFragmentId function does not handle special characters consistently. This could lead to invalid @id values for entities with non-Latin characters. (Severity: 4/5)

  - **Status: SOLVED** — Updated `sanitizeForIri()` to be IRI-compliant: spaces become underscores, and non-Latin characters (é, ñ, 中文, العربية, etc.) are preserved since they're valid in IRIs per RFC 3987. Only IRI-breaking characters (#, ?, /) and parentheses are encoded. Now "José" becomes `#contributor-José`.

- [x] **RoCrateExporter.ldac.spec.ts#234** — The test references ldac:DataReuseLicense, but this entity is not defined in the test setup. This may lead to false negatives during validation. (Severity: 4/5)

  - **Status: NOT AN ISSUE** — Per LAM-92, `ldac:DataReuseLicense` is intentionally NOT defined as a separate entity. It's used as a `@type` value on license entities, which doesn't require an entity definition in `@graph`. The test at line 702 explicitly verifies this is undefined.

- [x] **RoCrateExporter.people-dataset-all-contributors.spec.ts#63** — The test assumes createUnresolvedContributorId will always generate unique IDs. Add a test case to handle potential ID collisions. (Severity: 4/5)

  - **Status: SOLVED** — Added "ID collision handling for contributors" test suite with tests for: (1) unique IDs for special characters via percent-encoding, (2) consistent whitespace handling.

- [x] **RoCrateExporter.project-geographic-coverage.spec.ts#48** — The test does not verify that contentLocation references valid Place entities. Add assertions to ensure referenced entities exist. (Severity: 4/5)

  - **Status: SOLVED** — Added comprehensive assertions that: (1) verify ALL contentLocation references use proper JSON-LD format, (2) ensure each referenced Place entity exists in the graph with correct `@type` and `name`.

- [x] **RoCrateExporter.publisher-entity.spec.ts#44** — The test assumes #publisher-lameta is always defined. Add a setup step to ensure this entity exists in the graph. (Severity: 4/5)

  - **Status: SOLVED** — Added guard assertion with detailed error message if entity is missing, making test failures more informative.

- [x] **file-types.spec.ts#144** — The test for audio file types does not verify the presence of encodingFormat. Add an assertion to ensure this property is included. (Severity: 4/5)

  - **Status: SOLVED** — Added `encodingFormat` assertions to audio, video, and image file type tests using regex patterns like `expect(audioFile.encodingFormat).toMatch(/^audio\//)`.

- [x] **RoCrateExporter.ts#820** — The logic for handling hasPart/isPartOf relationships is repeated across multiple functions. Consider refactoring this into a shared utility function. (Severity: 3/5)

  - **Status: SOLVED** — Added `linkContainment()`, `createHasPartReferences()`, `createIsPartOfReference()`, and `addToHasPart()` utility functions in RoCrateUtils.ts. Refactored 6 sites in RoCrateExporter.ts to use these utilities.

- [x] **RoCrateHtmlGenerator.tsx#75** — The EntityProperties component is overly complex and mixes rendering logic with data processing. Consider separating the data processing into a helper function. (Severity: 3/5)

  - **Status: ALREADY SOLVED** — The code already has clean separation: `buildEntityProperties()` (lines 745-797) handles data processing, while `EntityProperties` component (lines 800-822) is a pure renderer.

- [ ] **RoCrateExporter.otherdocuments-fix.spec.ts#91** — The test duplicates logic for verifying OtherDocuments/ dataset existence. Consider refactoring this into a helper function. (Severity: 3/5)

- [ ] **RoCrateValidator.ldac-profile.spec.ts#92** — The test does not handle cases where ldac:subjectLanguage is missing but inLanguage is present. Add a test case for this scenario. (Severity: 3/5)

- [ ] **RoCrateValidator.rocrate-spec.spec.ts** — (Review pending)
