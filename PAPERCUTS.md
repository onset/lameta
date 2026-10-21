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

## `yarn strings:extract-code` alone empties `fields.po` and `vocabularies.po` (2026-10-20)

`strings:extract-code` runs `lingui extract --clean`, which drops every message that the code
does not contain. The archive configurations' strings in `locale/en/fields.po` and
`locale/en/vocabularies.po` come from `strings:extract-json`, so after the code extraction
alone, almost all of them are gone from those two files. Run `yarn strings:extract`, which
runs both, or restore the two files with `git checkout`.

## `yarn build` uses whatever translation catalogs were last compiled (2026-10-20)

`locale/*/*.js` are not committed; `yarn strings:compile` makes them, and only `yarn
fullbuild` runs it. After `yarn build` alone, a string added since the last compile is
missing from the catalog, and a production build shows its placeholders literally:
"Problems must be fixed before {archiveName} will accept this export." An e2e run on such a
build fails on text that is correct in the source. Run `yarn strings:compile` before
`yarn build` when strings have changed.

## `strings:extract` empties the translated `fields.po` and `vocabularies.po` (2026-10-21)

Since the Crowdin sort-out (#79), `locale/<lang>/fields.po` and `vocabularies.po` hold
translations. `strings:extract-code` runs `lingui extract --clean`, and `.linguirc` lists those
two catalogs with an `include` that matches no source, so lingui empties them for every
language. `strings:extract-json` then rewrites only `locale/en/`. After a `pnpm run
strings:extract`, check `git status locale` and restore every non-English `fields.po` and
`vocabularies.po` with `git checkout`.

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
