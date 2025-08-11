# Failing E2E Tests (as of 2025-08-11)

Un-checked boxes represent currently failing tests. When a test is fixed, check it off and add a short note referencing the commit / change.

## Failures

- [ ] ArchiveConfiguration › New project gets 'Other' and can enter custom access protocols  
      (Test File: [`e2e/archiveConfiguration.e2e.ts`](e2e/archiveConfiguration.e2e.ts))

  - Symptom: Timeout (30s). Click on `#customAccessChoices` never succeeds; renderer logs show repeated `Failed to initialize RendererTransport: window.__electronCall isn't defined` and multiple `net::ERR_FILE_NOT_FOUND` errors before timeout.
  - Observations: UI navigation to Project Configuration page likely succeeded ("Other" was asserted), but the input field interaction stalled—possibly app not fully initialized or preload bridge missing in test context.
  - Hypotheses:
    1. Electron preload script (that defines `window.__electronCall`) not loaded in test environment or race condition before it is defined.
    2. Project configuration panel lazy-load code depends on a resource failing to load (file-not-found) which blocks rendering / enabling of the input.
  - Next Steps:
    - Inspect preload / renderer initialization path to ensure `window.__electronCall` is set early.
    - Add a wait for selector existence before click; capture screenshot/DOM if absent.
    - Investigate missing resource paths causing `net::ERR_FILE_NOT_FOUND`.

- [ ] ArchiveConfiguration › Changing to ELAR gives Collection Tab, Steward, and ELAR access protocols  
      (Test File: [`e2e/archiveConfiguration.e2e.ts`](e2e/archiveConfiguration.e2e.ts))

  - Symptom: Expected collection tab to be hidden initially (`expect(...).toBeFalsy()`), but it was visible.
  - Observations: Starting configuration unexpectedly includes collection tab—maybe default archive type changed, or prior test (which timed out) left app in inconsistent state, but tests run in same describe after beforeAll.
  - Hypotheses:
    1. Default archive configuration now auto-adds collection tab (test expectation outdated).
    2. Residual state from partially executed first test (though first test timed out before leaving config view) left tab enabled.
  - Next Steps:
    - Log current archive configuration value before assertion.
    - Verify default config in code (search for initial archiveConfigurationName).
    - Decide whether test expectation or code should change.

- [ ] AutoFileAndFolderRenaming Tests › changing FullName renames the file  
      (Test File: [`e2e/autoFileAndFolderRenaming.e2e.ts`](e2e/autoFileAndFolderRenaming.e2e.ts))

  - Symptom: Timeout waiting for `#name` field (30s); repeated renderer init errors.
  - Observations: Test launches fresh Electron app in `beforeEach`; early renderer failure may prevent field from rendering.
  - Hypotheses:
    1. Regression in People tab rendering due to search bar changes (unlikely—field id unrelated) but possible mounting order issue.
    2. Same preload / initialization race causing earlier click attempts to fail.
  - Next Steps:
    - Add explicit wait for People tab main container before selecting `#name`.
    - Capture screenshot on timeout to inspect DOM.
    - Confirm component sets `id="name"` (grep) and not changed.

- [ ] AutoFileAndFolderRenaming Tests › changing FullName renames other files that have been renamed to match the person  
      (Test File: [`e2e/autoFileAndFolderRenaming.e2e.ts`](e2e/autoFileAndFolderRenaming.e2e.ts))

  - Symptom: Same as above: timeout waiting for `#name`.
  - Observations: Shares setup with previous test; likely same root cause.
  - Next Steps: Fix root cause from previous item; re-run both.

- [ ] Folder Search UI › search term persists visually across tab switch (sessions -> project -> sessions)  
      (Test File: [`e2e/folderSearch.e2e.ts`](e2e/folderSearch.e2e.ts) • Related Source: [`src/components/FolderList.Search.tsx`](src/components/FolderList.Search.tsx), [`src/model/Folder/Folder.ts`](src/model/Folder/Folder.ts))

  - Symptom: After switching away and back, search input value was empty (expected preserved query like `PersistMe123 Ω`).
  - Current Behavior: We persist `folders.searchTerm` (raw case), and `FolderList.Search` initializes `rawValue` from `lastSearch` (derived from `folders.searchTerm`). In full-file run prior to isolate-run flakiness, the value was lost.
  - Hypotheses:
    1. A filter clear is triggered on tab switch (e.g., adding a session resets search) between fill and return.
    2. Parent `FolderList` receives a `searchResetCounter` increment from some side effect (like session creation) leading to state reset.
    3. Race: switch happens before commit (need promise/Enter press or slight wait after fill).
  - Next Steps:
    - Add debug log in `FolderGroup.filter` when clearing to see who triggers reset.
    - Consider persisting raw value separately from cleared filter state or deferring filter clear on add until after capturing previous term.
    - Potential test tweak: press Enter before switching to ensure commit.

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
