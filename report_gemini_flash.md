# RO-Crate LDAC Profile Validation Issues

Based on Gemini 2.0 Flash validation of the Doondo project RO-Crate export:

## Issues Found

- [ ] **1. Incorrect `@type` for the Root Entity (`./`)**

  - Problem: Root entity has `@type` including both `Dataset` and `pcdm:Collection`, but LDAC profile specifies it should be `Collection` and not `Dataset`
  - Solution: Change `@type` to `ldac:Collection` and remove `Dataset` and `pcdm:Collection`

- [ ] **2. Missing `ro-crate-profile` property in the Root Entity (`./`)**

  - Problem: LDAC profile requires root entity to have `ro-crate-profile` property pointing to the LDAC profile
  - Solution: Add `"ro-crate-profile": { "@id": "https://w3id.org/ldac/profile" }`

- [ ] **3. Inconsistent use of `hasPart` vs `pcdm:hasMember`**

  - Problem: Both `hasPart` and `pcdm:hasMember` used to relate Collection to its members
  - Solution: Use `pcdm:hasMember` for Session objects, `hasPart` for collection metadata files

- [ ] **4. Incorrect `@type` for Session Objects**

  - Problem: Session objects have `@type` including `Dataset`, `pcdm:Object`, and `Event`, but should be `Event` only
  - Solution: Change `@type` to `Event` and remove `Dataset` and `pcdm:Object`

- [ ] **5. Incorrect `conformsTo` for Session Objects**

  - Problem: Session objects point to `https://w3id.org/ldac/profile#Object` instead of `#Session`
  - Solution: Change `conformsTo` to `https://w3id.org/ldac/profile#Session`

- [ ] **6. Incorrect `ldac:linguisticGenre` Value**

  - Problem: Value `tag:lameta/unknown` is not a standard LDAC term and not properly defined
  - Solution: Use standard LDAC `ldac:LinguisticGenreTerms` value or properly define custom term in `DefinedTermSet`

- [ ] **7. Inconsistent use of `datePublished` and `dateCreated`**

  - Problem: `datePublished` used on both Collection and Session objects
  - Solution: Use `datePublished` for Collection and `dateCreated` for Session objects

- [ ] **8. Missing `Place` for `location` and `contentLocation`**

  - Problem: Some session objects missing `Place` object for location references
  - Solution: Ensure all `location` and `contentLocation` properties point to proper `Place` objects

- [ ] **9. Incorrect `@type` for `File` objects**

  - Problem: Some files have `@type` as `DigitalDocument` instead of `File`
  - Solution: Change `@type` to `File` for file objects

- [ ] **10. Inconsistent use of participant properties**

  - Problem: Inconsistent use of `ldac:participant`, `ldac:speaker`, `ldac:interviewer`, and `ldac:researcher`
  - Solution: Be consistent - use `ldac:participant` for all participants, specific roles for specific functions

- [ ] **11. Missing `description` for `Person` objects**

  - Problem: LDAC profile recommends including `description` for Person objects
  - Solution: Ensure all Person objects have a `description` property

- [ ] **12. Incorrect `ldac:age` Value**

  - Problem: `ldac:age` property should be integer, not string
  - Solution: Change `ldac:age` from string `"77"` to integer `77`

- [ ] **13. Redundant `hasPart` entries**

  - Problem: `hasPart` property in Person objects has duplicate entries
  - Solution: Remove redundant entries from `hasPart` arrays

- [ ] **14. Missing `encodingFormat` for `DigitalDocument` objects**

  - Problem: Some `DigitalDocument` objects missing `encodingFormat` property
  - Solution: Add `encodingFormat` property to all `DigitalDocument` objects

- [ ] **15. Missing `name` for `Place` objects**

  - Problem: Some `Place` objects missing `name` property
  - Solution: Ensure all Place objects have a `name` property

- [ ] **16. Missing `ldac:materialType` for `File` objects**
  - Problem: Some File objects missing `ldac:materialType` property
  - Solution: Ensure all File objects have appropriate `ldac:materialType`

## Validation Status

- **Total Issues**: 16
- **Issues Resolved**: 0
- **Issues Remaining**: 16

---

_Generated from OpenRouter Gemini 2.0 Flash validation on 2025-08-06_
