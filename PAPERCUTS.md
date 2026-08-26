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
