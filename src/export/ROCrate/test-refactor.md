# RO-Crate Test Refactoring Plan

## Overview

Consolidating 17+ fragmented test files into 5 focused, well-organized test files with shared utilities to reduce duplication and improve maintainability.

## Current Test Files (17 files)

- RoCrateExporter.files.spec.ts
- RoCrateExporter.integration.spec.ts
- RoCrateExporter.ldac-access.spec.ts
- RoCrateExporter.ldac.spec.ts
- RoCrateExporter.pii.spec.ts
- RoCrateExporter.session-licensing-demo.spec.ts
- RoCrateExporter.spec.ts
- RoCrateExporter.subject-language.spec.ts
- RoCrateExporter.validation.spec.ts
- RoCrateHtmlGenerator.spec.ts
- RoCrateLanguages.spec.ts
- RoCrateLicense.spec.ts
- RoCrateLicenses.spec.ts
- RoCrateMaterialTypes.spec.ts
- RoCratePeople.spec.ts
- RoCrateSessions.spec.ts
- RoCrateValidator.spec.ts

## Target Structure (5 files + utilities)

```
src/export/ROCrate/__tests__/
├── test-utils/
│   └── rocrate-test-setup.ts
├── RoCrateComponents.spec.ts      # Languages, License, People, Sessions, MaterialTypes
├── RoCrateExporter.spec.ts         # Core export functionality, files, PII
├── RoCrateExporter.ldac.spec.ts    # LDAC profile compliance
├── RoCrateExporter.integration.spec.ts # End-to-end scenarios (existing)
└── RoCrateValidation.spec.ts       # Validator, HTML generator
```

## Phases

### Phase 1: Create Shared Test Utilities ✅ COMPLETE

- [x] 1.1 Create `__tests__/test-utils/` directory
- [x] 1.2 Create `rocrate-test-setup.ts` with common mocks and factories
- [x] 1.3 Extract `staticLanguageFinder` mock (used in 15+ files)
- [x] 1.4 Extract `fs-extra` mock patterns
- [x] 1.5 Create factory functions for Project, Session, Person
- [x] 1.6 Create field definition mock utilities
- [x] 1.7 Validation: Run `yarn test` - all existing tests should still pass

**Git Commit**: `8085725c` - "feat: consolidate RO-Crate component tests (Phases 1-2)"

### Phase 2: Consolidate Component Tests ✅ COMPLETE

- [x] 2.1 Create `RoCrateComponents.spec.ts`
- [x] 2.2 Migrate `RoCrateLanguages.spec.ts` tests
- [x] 2.3 Migrate `RoCrateLicense.spec.ts` tests
- [x] 2.4 Migrate `RoCrateLicenses.spec.ts` tests
- [x] 2.5 Migrate `RoCrateMaterialTypes.spec.ts` tests
- [x] 2.6 Migrate `RoCratePeople.spec.ts` tests
- [x] 2.7 Migrate `RoCrateSessions.spec.ts` tests
- [x] 2.8 Update all imports to use shared utilities
- [x] 2.9 Validation: Run `yarn test` - component tests should pass
- [x] 2.10 Remove old component test files one by one

**Git Commit**: `8085725c` - "feat: consolidate RO-Crate component tests (Phases 1-2)"

### Phase 3: Consolidate Core Exporter Tests ✅ COMPLETE

- [x] 3.1 Create new `RoCrateExporter.spec.ts`
- [x] 3.2 Migrate existing `RoCrateExporter.spec.ts` tests
- [x] 3.3 Migrate `RoCrateExporter.files.spec.ts` tests
- [x] 3.4 Migrate `RoCrateExporter.pii.spec.ts` tests
- [x] 3.5 Migrate `RoCrateExporter.session-licensing-demo.spec.ts` tests
- [x] 3.6 Organize into logical describe blocks
- [x] 3.7 Update imports to use shared utilities
- [x] 3.8 Validation: Run `yarn test` - core exporter tests should pass (21 tests passing)
- [x] 3.9 Remove old exporter test files incrementally

**Git Commit**: TBD - Phase 3 completion

### Phase 4: Consolidate LDAC Profile Tests

- [ ] 4.1 Create `RoCrateExporter.ldac.spec.ts`
- [ ] 4.2 Migrate existing `RoCrateExporter.ldac.spec.ts` tests
- [ ] 4.3 Migrate `RoCrateExporter.ldac-access.spec.ts` tests
- [ ] 4.4 Migrate `RoCrateExporter.subject-language.spec.ts` tests
- [ ] 4.5 Organize by LDAC concerns (Collection, Access, Languages, Materials)
- [ ] 4.6 Update imports to use shared utilities
- [ ] 4.7 Validation: Run `yarn test` - LDAC tests should pass
- [ ] 4.8 Remove old LDAC test files

### Phase 5: Create Validation Test File

- [ ] 5.1 Create `RoCrateValidation.spec.ts`
- [ ] 5.2 Migrate `RoCrateValidator.spec.ts` tests
- [ ] 5.3 Migrate `RoCrateHtmlGenerator.spec.ts` tests
- [ ] 5.4 Migrate `RoCrateExporter.validation.spec.ts` tests
- [ ] 5.5 Update imports to use shared utilities
- [ ] 5.6 Validation: Run `yarn test` - validation tests should pass
- [ ] 5.7 Remove old validation test files

### Phase 6: Preserve Integration Tests

- [ ] 6.1 Update `RoCrateExporter.integration.spec.ts` to use shared utilities
- [ ] 6.2 Validation: Run `yarn test` - integration tests should pass

### Phase 7: Final Cleanup

- [ ] 7.1 Remove any remaining old test files
- [ ] 7.2 Update any test script references if needed
- [ ] 7.3 Final validation: Run `yarn test` - all tests should pass
- [ ] 7.4 Verify test coverage hasn't decreased
- [ ] 7.5 Update this document with completion status

## Risk Mitigation

- ✅ After each phase: Run `yarn test` to catch issues immediately
- ✅ One file at a time: Don't remove multiple old files simultaneously
- ✅ Git commits: Commit a "chore:" after each successful phase
- ✅ Rollback plan: Keep old files until new structure is proven stable

## Success Criteria

- All existing tests continue to pass
- Reduced from 17 test files to 5 focused files + utilities
- Eliminated duplicate mocking and setup code
- Improved test organization and maintainability
- No decrease in test coverage
