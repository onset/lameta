# Failing E2E Tests (as of 2025-08-11)

Un-checked boxes represent currently failing tests. When a test is fixed, check it off and add a short note referencing the commit / change.

## Failures

- [x] ArchiveConfiguration › New project gets 'Other' and can enter custom access protocols  
      (Test File: [`e2e/archiveConfiguration.e2e.ts`](e2e/archiveConfiguration.e2e.ts))

  - **Fixed**: The test was looking for `#customAccessChoices` but the `TextFieldEdit` component generates random IDs. Added a wrapper div with `id="customAccessChoices"` around the `TextFieldEdit` component and updated the test to look for `#customAccessChoices [contenteditable]` to find the actual input element.

- [x] ArchiveConfiguration › Changing to ELAR gives Collection Tab, Steward, and ELAR access protocols  
      (Test File: [`e2e/archiveConfiguration.e2e.ts`](e2e/archiveConfiguration.e2e.ts))

  - **Fixed**: The test expectation was correct - the collection tab should be visible with the default configuration because it has collection fields with `visibility: "always"`. Added proper navigation to the project tab and wait for configuration reload. Also fixed the selector for the `collectionSteward` field to use `[data-testid="field-collectionSteward-edit"]` instead of `#collectionSteward`.

- [x] AutoFileAndFolderRenaming Tests › changing FullName renames the file  
       (Test File: [`e2e/autoFileAndFolderRenaming.e2e.ts`](e2e/autoFileAndFolderRenaming.e2e.ts))

  - ✅ **FIXED**: Modified `TextFieldEdit` component to use deterministic field IDs instead of random ones, and added proper `onBlur` handler support to trigger file renaming logic. Added timing wait for file operations to complete.

- [x] AutoFileAndFolderRenaming Tests › changing FullName renames other files that have been renamed to match the person  
       (Test File: [`e2e/autoFileAndFolderRenaming.e2e.ts`](e2e/autoFileAndFolderRenaming.e2e.ts))

  - ✅ **FIXED**: Same root cause as above test - fixed by restoring deterministic field IDs and proper onBlur handling.

- [x] Folder Search UI › search term persists visually across tab switch (sessions -> project -> sessions)  
       (Test File: [`e2e/folderSearch.e2e.ts`](e2e/folderSearch.e2e.ts) • Related Source: [`src/components/FolderList.Search.tsx`](src/components/FolderList.Search.tsx), [`src/model/Folder/Folder.ts`](src/model/Folder/Folder.ts))

  - ✅ **FIXED**: Modified `FolderList.getDerivedStateFromProps` to only clear search when `searchTerm` is empty, preserving search during tab switches while maintaining intentional clears (e.g., when adding sessions).

- [ ] ID Validation Tests › valid ID (no spaces) should allow tabbing to next field  
       (Test File: [`e2e/idValidation.e2e.ts`](e2e/idValidation.e2e.ts))

  - Symptom: Timeout waiting to click `#id` (page or context closed).
  - Observations: Same renderer init errors early in test.
  - Hypotheses:
    1. App not fully initialized when attempting to access the form; need readiness wait (e.g., wait for some known element).
    2. Preload/bridge failure cascading into early navigation issues.
  - Next Steps:
    - Introduce a helper `await page.waitForSelector('[data-testid="sessions-tab"]')` prior to interactions.
    - Investigate renderer init error root cause (shared with other failing suites).

- [ ] ID Validation Tests › empty ID should show tooltip and maintain focus  
       (Test File: [`e2e/idValidation.e2e.ts`](e2e/idValidation.e2e.ts))

  - Symptom: Same timeout on `#id`.
  - Notes: Blocked by prior test's root cause.
  - Next Steps: Resolve initialization; re-run.

- [ ] ID Validation Tests › ID with spaces should show tooltip and maintain focus  
       (Test File: [`e2e/idValidation.e2e.ts`](e2e/idValidation.e2e.ts))
  - Symptom: Same timeout on `#id`.
  - Next Steps: After fixing initialization, validate tooltip logic; may need additional delay for tooltip rendering.

## Cross-Cutting Issue

Repeated error across failing tests:
`Failed to initialize RendererTransport: window.__electronCall isn't defined.`
Indicates electron preload / IPC bridge not available when renderer code expects it.

Potential root causes:

- Preload script not specified / path mismatch in test Electron launch.
- Race: tests interact before app finished injecting globals.
- Refactor removed initialization call (e.g., `call.initialize()`) in main process.

## General Remediation Plan

1. Reproduce a single failing test in isolation with additional debug logging enabled (add temporary console logs in preload & first render points).
2. Confirm preload injection: verify BrowserWindow creation sets correct `preload` script path.
3. Add an explicit readiness signal (e.g., set a DOM attribute when initialized) and wait for it in tests before interacting.
4. Fix ArchiveConfiguration default expectation vs behavior.
5. Re-run full suite; iterate remaining edge cases (search persistence, rename tests).

## Tracking

Mark each item as fixed with a short note (commit hash + summary) when addressed.
