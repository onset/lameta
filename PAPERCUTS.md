# Papercuts

Short notes about friction and traps in this repo. Append; do not rewrite.

## An e2e test that reads text cannot see a clipped dropdown (2026-08-26)

`e2e/createLanguage.e2e.ts` asserted on the text of the react-select menu. The menu was in
the document, so the tests passed, but on the Session and Person forms an ancestor with
`overflow-y: hidden` cut off all 300 pixels of it, so the user saw nothing. Playwright's
`:visible` does not help: it tests the bounding box, not clipping by an ancestor.

For a dropdown, a tooltip, or any element that leaves its own box, assert the geometry as
well as the text. `expectNothingClipsTheMenu` in that file walks up from the menu and fails
if an ancestor with overflow hidden ends above the menu's bottom.

## The e2e suite runs `dist/`, not the source (2026-08-26)

`playwright.config.ts` has no build step, so `npx playwright test` drives whatever
`yarn build` last wrote. A source edit has no effect on an e2e run until you build. Cost: two
test runs that measured the old bundle and reported the defect as fixed.

## The pre-commit hook cannot commit a merge from master (2026-10-21)

The hook runs `vp check --fix` on every staged file, and a merge stages every file that the
other side changed. Two things in `origin/master` then fail it. `tsconfig.json` leaves
`**/*.spec.ts` and `archive-configurations/` out of the project, so the type-aware lint checks
those files with default settings: no `node` types and `noImplicitAny` on. And about 47 files,
such as the `crowdin-backup/` JSON and `scripts/crowdin/*.ts`, are not `vp fmt`-clean, so the
hook rewrites them.

In a linked worktree the failure is worse. The first failed run deleted `MERGE_HEAD`,
`MERGE_MSG` and `MERGE_MODE` from `.git/worktrees/<name>/`, staged its formatting changes while
reporting that it had reverted them, and the next run stopped at "Failed to back up original
state". After a failed hook during a merge, check `git status` for "still merging" and compare
`git write-tree` against the expected result before you try again.
