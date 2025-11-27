# RO-Crate Export Issues

## 1. Context configuration

- **Observation:** The crate declares multiple JSON-LD contexts and repeats schema.org term mappings inline.
- **Impact:** RO-Crate requires a single core context; extra contexts and redundant mappings break compliance and may confuse consumers.
- **Action:** Emit only the core RO-Crate context, and add a JSON-LD prefix block for the LDaC terms (e.g. `{ "ldac": "http://w3id.org/ldac/terms#" }`). Remove explicit mappings for schema.org and PCDM terms already provided by the core context.

## 2. Root dataset typing

- **Observation:** The root entity uses `"@type": ["Dataset", "pcdm:Collection"]`.
- **Impact:** In the RO-Crate profile, `pcdm:Collection` maps to `RepositoryCollection`; failing to use that value causes validation warnings with LDaC tooling.
- **Action:** Replace `pcdm:Collection` with `RepositoryCollection` for the root dataset type list.

## 3. Missing dataset description

- **Observation:** The root dataset has an empty `description` property.
- **Impact:** RO-Crate treats an empty string as missing metadata, failing validation and preventing downstream summarisation.
- **Action:** Populate `description` with a meaningful summary that elaborates on the dataset name.

## 4. Publisher metadata

- **Observation:** `publisher` references `https://github.com/onset/lameta` at both collection and object levels.
- **Impact:** This points to the software rather than the organisation responsible for publication, misrepresenting custodianship.
- **Action:** Populate `publisher` with the responsible organisation entity (and ensure that entity is defined) for the collection and each repository object.

## 5. Unknown contributor identifiers

- **Observation:** `author`, `accountablePerson`, and `dct:rightsHolder` all point to `#unknown-contributor`.
- **Impact:** LDaC requires these to resolve to real Person or Organization entities; using placeholders prevents validation and provenance tracking.
- **Action:** Link each role to an actual, defined Person/Organization entity; if data is truly unknown, omit the property rather than point to an invalid node.

## 6. Misuse of `hasPart`

- **Observation:** The root `hasPart` array includes person entities alongside files/directories.
- **Impact:** `hasPart` must only contain data entities; including people breaks schema expectations and tools that traverse file hierarchies.
- **Action:** Restrict `hasPart` to files and datasets. Link people through appropriate relationship properties instead.

## 7. Undefined `archiveConfigurationName`

- **Observation:** `archiveConfigurationName` appears in metadata but is not part of the core context.
- **Impact:** Consumers cannot interpret undefined properties, causing validation errors.
- **Action:** Either map this value to an existing property (e.g. `publisher`) or extend the JSON-LD context to define `archiveConfigurationName`.

## 8. Depositor modelling

- **Observation:** The root dataset uses a plain string `"depositor": "Nick Thieberger"`, while nested objects use `ldac:depositor` with linked entities.
- **Impact:** Mixed modelling causes inconsistency and hinders automation; the string form is not valid under LDaC.
- **Action:** Always express depositor as `ldac:depositor` referencing a defined Person entity.

## 9. Geographic fields

- **Observation:** `country` and `continent` are emitted as plain-string properties.
- **Impact:** These terms are not in schema.org or the core context, so they fail validation.
- **Action:** Represent location via schema.org `contentLocation` or define custom properties within the JSON-LD context.

## 10. Language metadata

- **Observation:** `ldac:subjectLanguage` points to `#language_und`, and `inLanguage` is missing.
- **Impact:** LDaC-compliant crates require `inLanguage`. Using an undefined placeholder hampers discovery.
- **Action:** Add `inLanguage` for determined languages. For undetermined languages, align on a shared strategy (e.g. omit, or use a defined placeholder node agreed with LDaC maintainers) and document it.

## 11. Data entity identifiers

- **Observation:** Dataset-level IDs such as `Sessions/…/` are emitted without a leading `#` and do not resolve relative to the root dataset when no base URI exists.
- **Impact:** Violates RO-Crate rules for entity identifiers, breaking link resolution.
- **Action:** For non-file entities, mint fragment identifiers (e.g. `#session-…`). Reserve path-like IDs for file entities that actually exist at those paths.

## 12. Object typing

- **Observation:** Session objects are typed as `"Dataset", "pcdm:Object", "Event"` and similar combinations.
- **Impact:** `pcdm:Object` should be expressed as `RepositoryObject`. Additional types must still align with RO-Crate roles; `Dataset` is redundant for nested entities.
- **Action:** Use `RepositoryObject` (and any justified domain-specific types) for session entities; drop redundant or incorrect types.

## 13. LDaC term references

- **Observation:** Terms like `ldac:linguisticGenre` use the compact IRI `ldac:Song` but rely on an undefined prefix.
- **Impact:** Without the prefix declaration, the values are invalid IRIs.
- **Action:** After defining the `ldac` prefix in the context, emit full IRIs or ensure the compact notation resolves (e.g. `"@id": "https://w3id.org/ldac/terms#Song"`).

## 14. Custom sociolinguistic fields

- **Observation:** Fields such as `involvement`, `planningType`, and `socialContext` are emitted without context definitions.
- **Impact:** Unmapped properties are dropped by consumers and can fail validation.
- **Action:** Either register these with the LDaC schema or define them in the crate context. Ensure downstream systems recognise them before including.

## 15. Missing role assignments on objects

- **Observation:** Session-level objects omit `author`, `rightsHolder`, and `accountablePerson`.
- **Impact:** These roles are mandatory for LDaC compliance; omission prevents acceptance into the commons.
- **Action:** Mirror the role metadata from the root dataset onto each object, pointing to the appropriate Person/Organization entities.

## 16. Exported `.person` profiles

- **Observation:** Person profile files (`*.person`) are emitted as `DigitalDocument` with `ldac:materialType` shorthand and no annotation linkage.
- **Impact:** Privacy concerns may arise if personal profile files are distributed; metadata also mislabels the file and lacks `ldac:annotationOf` relationships.
- **Action:** Reassess whether these files should be exported at all. If retained, type them as `File`, use full URIs for `ldac:materialType`, and add the required annotation linkage metadata.

## 17. Person entity modelling

- **Observation:** Person entities use path-based `@id` values and include `hasPart` pointing to `.person` files.
- **Impact:** RO-Crate expects Person IDs to be fragment identifiers (or external URIs) and disallows `hasPart` on Person entities.
- **Action:** Assign fragment IDs (or ORCID URIs) to Person entities, drop `hasPart`, and reference associated files via annotations or other relationships.

## 18. Session `.session` files

- **Observation:** Session metadata files are typed as `DigitalDocument`, use shorthand LDaC IRIs, and lack `ldac:annotationOf` links.
- **Impact:** RO-Crate expects these exported files to be typed as `File` with correct annotations; shorthand IRIs fail resolution.
- **Action:** Retype as `File`, use full LDaC term URIs, and add `ldac:annotationOf`/`ldac:annotationType` metadata, along with a PRONOM ID when available.

## 19. Missing primary media files

- **Observation:** The crate bundles Lameta-generated annotation/session files but omits the original media assets they describe.
- **Impact:** Consumers receive incomplete datasets; annotations cannot be interpreted without the underlying files.
- **Action:** Include the associated audio/video/text files in the crate when sharing full sessions, or clarify that the crate is annotation-only.

## 20. Developer-mode validation gap

- **Observation:** Developer-mode exports finish silently even when the generated RO-Crate violates the LDAC profile; the validator file never loads the profile JSON or runs automatically during export.
- **Impact:** Engineers must run external validators to discover schema regressions, so LDAC issues ship unnoticed and block downstream ingestion.
- **Action:** Load `src/export/comprehensive-ldac.json` in the validator, run it whenever developer mode triggers an export, and surface the resulting error list via a dialog so problems can be fixed immediately. Linked Linear issue: LAM-64.

## 21. Comment clarity

- **Observation:** Many RO-Crate source comments describe historical refactors (e.g., “LAM-84: Use consolidated helper…”) instead of documenting current behaviour.
- **Impact:** Future readers must parse commit lore to understand intent, making it harder to audit LDAC compliance rules.
- **Action:** Reword comments to capture present-day intent or reference standing specifications rather than past worklog IDs.
