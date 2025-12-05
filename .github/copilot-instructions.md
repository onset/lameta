# GitHub Copilot Instructions for lameta

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

## Coding Guidelines

### React & TypeScript
- Always use arrow functions and function components in React
- Avoid removing existing comments
- Avoid adding comments like "// add this line"
- Style elements using the css macro from @emotion/react directly on the element being styled, using the css prop:
  ```tsx
  <div css={css`color: red;`}>
  ```

### Testing
- Use vitest, not jest
- Use `yarn test` in terminal to run unit tests (the "run_tests" tool often hangs)
- Fail Fast: Don't write code that silently works around failed dependencies. If a dependency is missing we should fail.
  - Example: Don't write `if(foo){}` - just use `foo` and let it fail if null
- When making test data, include edge cases:
  - Spaces, slashes, special characters in filenames and URLs
  - Wide range of Unicode characters (app deals with all human language scripts)

### E2E Testing with Playwright
- Use `yarn e2e` to run UI tests
- Run specific file: `yarn e2e <file-name>`
- To see all renderer console messages and failed network requests: `E2E_VERBOSE=1 yarn e2e <file-name>`
- Normally `yarn e2ebuildwatch` should be running in a different terminal
- After changing core app code, sleep 20 seconds before launching e2e tests so e2ebuildwatch can finish
- If changes don't appear in e2e, try a console.log as sanity check
- `yarn e2ebuildwatch` is NOT reliable for changes to main, preload, etc. Only render process. Do `yarn build` after touching these.
- Factor out helper functions to `*-e2e-helpers.ts` files (check existing helpers before creating new ones)
- Avoid time-based waiting; use DOM-based checks when possible

### Debugging E2E Test Failures
- Add console.log() statements (they appear in terminal) - remember to remove them
- Use time-based waits for debugging only, replace with better approach ASAP
- Try reproducing with unit test instead (often easier to debug)

## Issue Tracking with bd (beads)

**CRITICAL**: This project uses **bd** for ALL task tracking. Do NOT create markdown TODO lists.

### Essential Commands

```bash
# Find work
bd ready --json                    # Unblocked issues

# Create and manage
bd create "Title" -t bug|feature|task -p 0-4 --json
bd create "Subtask" --parent <epic-id> --json  # Hierarchical subtask
bd update <id> --status in_progress --json
bd close <id> --reason "Done" --json

# Search
bd list --status open --priority 1 --json
bd show <id> --json
```

### Workflow

1. **Check ready work**: `bd ready --json`
2. **Claim task**: `bd update <id> --status in_progress`
3. **Work on it**: Implement, test, document
4. **Discover new work?** `bd create "Found bug" -p 1 --deps discovered-from:<parent-id> --json`
5. **Complete**: `bd close <id> --reason "Done" --json`
6. **Commit together**: Always commit `.beads/issues.jsonl` with code changes

### Issue Types & Priorities

**Types**: `bug`, `feature`, `task`, `epic`, `chore`

**Priorities**:
- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

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

## Important Rules

- ✅ Use bd for ALL task tracking
- ✅ Always use `--json` flag for programmatic bd commands
- ✅ Use yarn (NEVER npm)
- ✅ Check existing helper functions before creating new ones
- ✅ Store AI planning docs in `history/` directory
- ❌ Do NOT create markdown TODO lists
- ❌ Do NOT use npm commands
- ❌ Do NOT remove existing comments
- ❌ Do NOT clutter repo root with planning documents

---

**For detailed bd workflow and advanced features, see [AGENTS.md](AGENTS.md)**
