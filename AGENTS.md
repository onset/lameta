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

pnpm through Vite+ (`vp`), one TypeScript stack, no .NET.

- Typecheck: `pnpm exec tsc --noEmit`
- Lint: `vp lint`
- Format: `vp fmt`
- Unit tests: `vp test run`
- Build: `pnpm run build`
- End-to-end tests: `pnpm run build` first, then `pnpm run e2e`. The suite drives `dist/`, and
  `playwright.config.ts` runs no build of its own, so a source edit without a build tests the
  old bundle.

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->
