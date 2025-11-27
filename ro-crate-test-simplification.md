# RO-Crate Test Suite Simplification Plan

This document outlines a prioritized plan to simplify the RO-Crate test suite in `src/export/ROCrate/__tests__/`.

## Analysis Summary

The test directory contains **37+ test files**. Analysis identified several categories of issues:

### Issues Found

1. **Clear Duplicates**: `LAM-65-file-types.spec.ts` is nearly identical to `file-types.spec.ts`
2. **Integration Tests Requiring External Data**: 4 tests require the "Doondo" project to exist at a specific path
3. **Overlapping Test Coverage**: Multiple files test similar functionality (LDAC compliance, file types, etc.)
4. **Unit Tests for Utilities**: Well-organized and should be kept as-is (RoCrateUtils, RoCrateLanguages, etc.)

---

## Prioritized Action Items

### Priority 1: Clear Duplicates (High Impact, Low Risk)

- [x] **1.1 Delete `LAM-65-file-types.spec.ts`** ✅ COMPLETED
  - This file was nearly identical to `file-types.spec.ts`
  - Both tested the same file @type mapping (File, AudioObject, VideoObject, ImageObject)
  - The remaining `file-types.spec.ts` already references LAM-65 in its header comments
  - **Action taken**: Deleted `LAM-65-file-types.spec.ts`

### Priority 2: Move Manual/Integration Tests (Medium Impact, Low Risk)

- [x] **2.1 Move Doondo integration tests to `manual/` folder** ✅ COMPLETED
  - These tests require an external project at a specific path and skip if not present
  - They're valuable for real-world validation but should not be in the main test suite
  - **Files moved**:
    - `RoCrateExporter.doondo-integration.spec.ts` → `manual/`
    - `RoCrateExporter.problem3-location.spec.ts` → `manual/`
  - **Note**: Files `RoCrateExporter.location-doondo.spec.ts` and `RoCrateExporter.problem3-location-broader.spec.ts` did not exist in the directory (may have been removed in a previous cleanup)

### Priority 3: Consolidate File Type Tests (Medium Impact, Medium Risk)

- [x] **3.1 Consider merging `RoCrateExporter.files.spec.ts` into `file-types.spec.ts`** ✅ REVIEWED - KEEP SEPARATE
  - Analyzed both files and confirmed they test **different aspects**:
    - `file-types.spec.ts` (341 lines): Tests **@type mapping** - verifies that files get correct types based on extension (audio→AudioObject, video→VideoObject, image→ImageObject, other→File)
    - `RoCrateExporter.files.spec.ts` (134 lines): Tests **graph relationships** - verifies `hasPart` linking (session files linked to session entity), `image` property linking (person photos), and confirms files don't have incorrect `role` property
  - **Decision**: Keep separate - these test orthogonal concerns (type assignment vs. relationship structure)

### Priority 4: Review Issue-Specific Test Files (Low Impact, Medium Risk)

The following files are tied to specific Linear issues and should be reviewed to determine if they can be consolidated once the bugs are verified fixed:

- [x] **4.1 Review `LAM-60-project-file-id.spec.ts`** ✅ REVIEWED - KEEP

  - Tests that .sprj file @id uses root-relative path (`./hewya.sprj`) not `People/hewya/hewya.sprj`
  - This was a real bug where Projects were incorrectly treated like Persons in `createFileId()`
  - **Decision**: Keep - documents important regression fix for LAM-60, prevents future breakage

- [x] **4.2 Review `LAM-66-inverse-links.spec.ts`** ✅ REVIEWED - KEEP
  - Tests bidirectional relationships required by LDAC profile (318 lines, comprehensive):
    - `hasPart/isPartOf` for session files pointing back to session entity
    - `subjectOf/about` for person metadata files
    - `image/about` for person photo files
    - Consistency checks ensuring every forward reference has an inverse
  - References LDAC profile requirement: "The relational hierarchy between Collections, Objects and Files are represented bidirectionally"
  - **Decision**: Keep - comprehensive tests for LDAC bidirectional requirements, well-documented with spec references

then run all the tests and make sure they pass, then commit.

### Priority 5: Low-Value Tests to Potentially Remove (Low Impact, Low Risk)

- [ ] **5.1 Review `RoCrateExporter.array-deduplication.spec.ts`**
  - Tests a local deduplication function defined inline (duplicating code from `RoCrateExporter.ts`)
  - The actual function exists at line 879 of `RoCrateExporter.ts` but is not exported
  - **Recommendation**: Either export `deduplicateHasPartArrays` and import it in the test, OR keep as-is since it documents expected behavior. Low priority - function is currently tested adequately.

### Priority 6: Tests to Keep As-Is (No Action Needed)

The following files are well-organized unit tests that should remain:

- `RoCrateUtils.spec.ts` - Unit tests for ID generation, sanitization, vocabulary mapping
- `RoCrateValidator.spec.ts` - Unit tests for validation class
- `RoCrateComponents.spec.ts` - Component tests for RoCrateLanguages, RoCrateLicense, etc.
- `RoCrateSessions.spec.ts` - Unit tests for session entry creation
- `RoCrateExporter.spec.ts` - Core exporter tests (genre, LDAC compliance, document folders)
- `RoCrateExporter.ldac.spec.ts` - LDAC-specific compliance tests
- `RoCrateExporter.validation.spec.ts` - Validation-focused tests with session ID sanitization
- `RoCrateExporter.integration.spec.ts` - Full integration test with ETR009 example
- `RoCrateExporter.person-references.spec.ts` - Person reference consistency tests
- `RoCrateLicense.normalization.spec.ts` - License ID normalization tests
- `RoCrateExporter.inLanguage.spec.ts` - LDAC inLanguage compliance
- `RoCrateExporter.ldac-age.spec.ts` - LDAC age field format test
- `RoCrateExporter.additional-fields.spec.ts` - Tests for excluding fields without context
- `RoCrateExporter.empty-description.spec.ts` - Tests empty description handling
- `RoCrateExporter.iri-validation.spec.ts` - IRI/URI format validation
- `RoCrateFieldIntegration.spec.ts` - Real field definition integration tests
- `FieldDefinitionComparison.spec.ts` - Field definition validation
- `RoCrateExporter.publisher-entity.spec.ts` - Publisher entity tests
- `RoCrateExporter.pii.spec.ts` - PII handling tests
- `RoCrateExporter.license-fix.spec.ts` - License fix tests
- `RoCrateExporter.otherdocuments-fix.spec.ts` - Other documents folder tests
- `RoCrateExporter.project-geographic-coverage.spec.ts` - Geographic coverage tests
- `RoCrateExporter.session-licensing-demo.spec.ts` - Session licensing demo
- `RoCrateExporter.unresolved-contributor.spec.ts` - Unresolved contributor handling
- `RoCrateHtmlGenerator.spec.ts` - HTML generator tests
- `ROCrateUpdate.spec.ts` - Update functionality tests

---

## Execution Progress

### Completed Actions

1. ✅ **Priority 1.1**: Deleted `LAM-65-file-types.spec.ts` (duplicate of `file-types.spec.ts`)
2. ✅ **Priority 2.1**: Moved Doondo integration tests to `manual/` folder:
   - `RoCrateExporter.doondo-integration.spec.ts`
   - `RoCrateExporter.problem3-location.spec.ts`
   - Fixed import paths for the moved files
3. ✅ **Priority 3.1**: Reviewed file type tests - decided to **keep separate**:
   - `file-types.spec.ts` tests @type mapping (File, AudioObject, etc.)
   - `RoCrateExporter.files.spec.ts` tests graph relationships (hasPart linking)
4. ✅ **Priority 4.1**: Reviewed `LAM-60-project-file-id.spec.ts` - decided to **keep**:
   - Documents important regression fix for .sprj file @id paths
5. ✅ **Priority 4.2**: Reviewed `LAM-66-inverse-links.spec.ts` - decided to **keep**:
   - Comprehensive LDAC compliance tests for bidirectional relationships

### Test Results After Changes

- **77 test files** (76 passed, 1 skipped)
- **574 tests** (573 passed, 1 skipped)
- All tests pass ✅

### Notes

- All changes should be verified by running `yarn test` after each modification
- The LDAC profile and RO-Crate 1.2 specs should be consulted when uncertain about test validity
