# AI Agent Instructions for lameta

## Project Overview

**lameta** is an Electron-based desktop application for managing language documentation metadata. It helps linguists and language documenters organize and prepare their data for archiving.

**Key Features:**

- Session and person metadata management
- Archive configuration support (ELAR, PARADISEC, AILLA, etc.)
- Multi-language localization
- File organization and validation
- Export capabilities for various archives

## Tech Stack

- **Runtime**: Electron
- **Language**: TypeScript
- **UI Framework**: React with MUI (Material-UI)
- **Styling**: Emotion (css macro)
- **Build Tool**: Vite
- **Package Manager**: yarn 1.22.22 (NEVER use npm)
- **Testing**: Vitest for unit tests, Playwright for E2E tests

## Code Style

- Always use arrow functions and function components in React
- Avoid removing existing comments
- Avoid adding comments like "// add this line"
- Style elements using the css macro from @emotion/react directly on the element being styled, using the css prop:
  ```tsx
  <div css={css`color: red;`}>
  ```

## Testing

- Use vitest, not jest
- Use `yarn test` in terminal to run unit tests (the "run_tests" tool often hangs)
- Fail Fast: Don't write code that silently works around failed dependencies. If a dependency is missing we should fail. Javascript itself will fail if we try to use a missing dependency, and that's fine.
  - Example: Don't write `if(foo){}` - just use `foo` and let it fail if null
- When making test data, include edge cases:
  - Spaces, slashes, special characters in filenames and URLs
  - Wide range of Unicode characters (app deals with all human language scripts)

## E2E Testing with Playwright

- Use `yarn e2e` to run UI tests
- Run specific file: `yarn e2e <file-name>`
- To see all renderer console messages and failed network requests: `E2E_VERBOSE=1 yarn e2e <file-name>`
- Normally `yarn e2ebuildwatch` should be running in a different terminal
- After changing core app code, sleep 20 seconds before launching e2e tests so e2ebuildwatch can finish
- If changes don't appear in e2e, try a console.log as sanity check
- `yarn e2ebuildwatch` is NOT reliable for changes to main, preload, etc. Only render process. Do `yarn build` after touching these.
- Factor out helper functions to `*-e2e-helpers.ts` files (check existing helpers before creating new ones)
- Avoid time-based waiting; use DOM-based checks when possible

## Fast Launch (recommended for new tests)

Tests that are not explicitly testing registration or creating projects can use `launchWithProject()` from `various-e2e-helpers.ts` to bypass the registration dialog and start screen UI, creating a project directly. This significantly speeds up E2E tests.

### Debugging E2E Test Failures

- Add console.log() statements (they appear in terminal) - remember to remove them
- Use time-based waits for debugging only, replace with better approach ASAP
- Try reproducing with unit test instead (often easier to debug)

## General Guidelines

- When debugging with temporary one-off code files in terminal, don't leave them laying around
- Mark problems that need human attention with "⚠️"
- Mark questions with "❓"

## Linear Usage

When working with Linear issues:

- Check off todo items that you've accomplished (if MCP server allows)
- Never close Linear issues yourself - assign them back to whoever assigned it to you
- When asked to "comment," call `mcp_linear_create_comment` (NOT `mcp_linear_update_issue`)
- Never create or remove Linear issues

**Benefits:**

- ✅ Clean repository root
- ✅ Clear separation between ephemeral and permanent documentation
- ✅ Easy to exclude from version control if desired
- ✅ Preserves planning history for archeological research
- ✅ Reduces noise when browsing the project

## Important Rules

- ✅ Use yarn (NEVER npm)
- ✅ Check existing helper functions before creating new ones
- ✅ Store AI planning docs in `history/` directory
- ❌ Do NOT use npm commands
- ❌ Do NOT remove existing comments
- ❌ Do NOT clutter repo root with planning documents
