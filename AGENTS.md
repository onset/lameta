# Agent instructions for lameta

## Issue tracker: none

lameta uses **no card tracker**. There is no YouTrack project, and GitHub issues are not
used as work cards for branches.

- Ticket ids: none. Branch names carry no ticket id.
- Tracker skill: none.

Skills that want a tracker (`preflight`, `pr-ready-for-human`, `add-test-ideas`) must skip
every card step, note the skip once, and continue. Do not ask again, and do not search for a
tracker. A file name such as `playwright-screenshot-LAM-25.png` is a stray artifact, not
evidence of a tracker.

## Toolchain

Yarn, one TypeScript stack, no .NET.

- Typecheck: `yarn tsc --noEmit`
- Lint: `yarn eslint src`
- Unit tests: `yarn vitest run`
- Build: `yarn build`
- End-to-end tests: `yarn build` first, then `yarn e2e`. The suite drives `dist/`, and
  `playwright.config.ts` runs no build of its own, so a source edit without a build tests the
  old bundle.
