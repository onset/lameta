# Stack

- electron
- typescript
- MUI
- Emotion
- yarn 1.22.22
- Never use npm commands

# Code Style

- Always use arrow functions and function components in React

- Avoid removing existing comments.
- Avoid adding a comment like "// add this line".

- Style elements using the css macro from @emotion/react directly on the element being styled, using the css prop. E.g. `<div css={css`color:red`}>`

# Testing

- Use vitest, not jest.

- Use `yarn test` in a terminal to run unit tests. The "run_tests" tool often hangs.

- Fail Fast. Don't write code that silently works around failed dependencies. If a dependency is missing we should fail. Javascript itself will fail if we try to use a missing dependency, and that's fine. E.g. if you expect a foo to be defined, don't write "if(foo){}". Just use foo and if it's null, fine, we'll get an error, which is good.

- When making test data, include things that could trip up code. Include things like spaces, slashes, and other characters that could cause issues with file names, URLs, IRIs. This is an app that deals in all human language scripts, so we have to test for a wide range of inputs and edge cases.

# Edge to Edge (e2e) testing

- We use playwright.

- By default e2e output only shows renderer console errors (to reduce noise). To see all renderer console messages and failed network requests, run with the environment variable `E2E_VERBOSE=1` (or `true`). Example: `E2E_VERBOSE=1 yarn e2e e2e/fileList.e2e.ts`.

- Use `yarn e2e` in a terminal to run UI tests. Run these when you have done something that is obviously in the UI. You can run a particular file with `yarn e2e <file-name>`.

- Normally e2ebuildwatch will already be running in a different terminal. Sleep 20 seconds after changing the core app code before launching e2e test so that the e2ebuildwatch can finish.

- If you make a change and e2e does not seem to reflect the change, try a console.log statement as a sanity check. If e2ebuildwatch is running, it should pick up the changes, but if it is not, you may need to run it or do a `yarn build`.

- yarn e2ebuildwatch is not reliable for changes to main, preload, etc. Only things in the render process. Therefore, make sure to do a `yarn build` after touching these things. Wait for it to finish, then continue.

- Keep the e2e tests clean by factoring out helper functions that are used across tests. Always check \*-e2e-helpers.ts and for helper functions to use instead of reinventing the wheel. For example, various-e2e-helpers.ts has methods for interacting with the project, and FolderSearch-e2e-helpers.ts had helper methods if you test involves the search function.

- try not to use time-based waiting that might fail on slower machines. Try to find some dom-based thing to tell you that that the screen is ready.

## What to do if you cannot figure out why an e2e test fails

- try adding a console.log() statement will give you the information you need to debug the issue. It will appear in the terminal. Remember to remove these after everything is passing.

- try adding time-based waits for debugging purposes, but remember to replace them with something better as soon as possible.

- can you reproduce the problem using a unit test instead? Often they are easier to work with. Then once the unit test is passing, you can go back to getting the e2e test to pass.

# General

When doing debugging by writing temporary one-off code files in the terminal, remember not to leave them laying around.

If you had a problem you need me to solve, mark it with a "⚠️". If you have a question, mark it with a "❓".

# Linear Usage

When working with linear issues:

- if the mcp server lets you, check off any todo items that you have accomplished.
- never close linear issues by yourself. Instead, assign them back to whoever assigned it to you.
- When I say “comment,” you must call mcp_linear_create_comment. Never call mcp_linear_update_issue.
- never create or remove linear issues

# Beans

## Issue Tracking with bd (beads)

**IMPORTANT**: This project uses **bd (beads)** for ALL issue tracking. Do NOT use markdown TODOs, task lists, or other tracking methods.

### Why bd?

- Dependency-aware: Track blockers and relationships between issues
- Git-friendly: Auto-syncs to JSONL for version control
- Agent-optimized: JSON output, ready work detection, discovered-from links
- Prevents duplicate tracking systems and confusion

### Quick Start

**Check for ready work:**

```bash
bd ready --json
```

**Create new issues:**

```bash
bd create "Issue title" -t bug|feature|task -p 0-4 --json
bd create "Issue title" -p 1 --deps discovered-from:bd-123 --json
bd create "Subtask" --parent <epic-id> --json  # Hierarchical subtask (gets ID like epic-id.1)
```

**Claim and update:**

```bash
bd update bd-42 --status in_progress --json
bd update bd-42 --priority 1 --json
```

**Complete work:**

```bash
bd close bd-42 --reason "Completed" --json
```

### Issue Types

- `bug` - Something broken
- `feature` - New functionality
- `task` - Work item (tests, docs, refactoring)
- `epic` - Large feature with subtasks
- `chore` - Maintenance (dependencies, tooling)

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Workflow for AI Agents

1. **Check ready work**: `bd ready` shows unblocked issues
2. **Claim your task**: `bd update <id> --status in_progress`
3. **Work on it**: Implement, test, document
4. **Discover new work?** Create linked issue:
   - `bd create "Found bug" -p 1 --deps discovered-from:<parent-id>`
5. **Complete**: `bd close <id> --reason "Done"`
6. **Commit together**: Always commit the `.beads/issues.jsonl` file together with the code changes so issue state stays in sync with code state

### Auto-Sync

bd automatically syncs with git:

- Exports to `.beads/issues.jsonl` after changes (5s debounce)
- Imports from JSONL when newer (e.g., after `git pull`)
- No manual export/import needed!

### GitHub Copilot Integration

If using GitHub Copilot, also create `.github/copilot-instructions.md` for automatic instruction loading.
Run `bd onboard` to get the content, or see step 2 of the onboard instructions.

### MCP Server (Recommended)

If using Claude or MCP-compatible clients, install the beads MCP server:

```bash
pip install beads-mcp
```

Add to MCP config (e.g., `~/.config/claude/config.json`):

```json
{
  "beads": {
    "command": "beads-mcp",
    "args": []
  }
}
```

Then use `mcp__beads__*` functions instead of CLI commands.

### Managing AI-Generated Planning Documents

AI assistants often create planning and design documents during development:

- PLAN.md, IMPLEMENTATION.md, ARCHITECTURE.md
- DESIGN.md, CODEBASE_SUMMARY.md, INTEGRATION_PLAN.md
- TESTING_GUIDE.md, TECHNICAL_DESIGN.md, and similar files

**Best Practice: Use a dedicated directory for these ephemeral files**

**Recommended approach:**

- Create a `history/` directory in the project root
- Store ALL AI-generated planning/design docs in `history/`
- Keep the repository root clean and focused on permanent project files
- Only access `history/` when explicitly asked to review past planning

**Example .gitignore entry (optional):**

```
# AI planning documents (ephemeral)
history/
```

**Benefits:**

- ✅ Clean repository root
- ✅ Clear separation between ephemeral and permanent documentation
- ✅ Easy to exclude from version control if desired
- ✅ Preserves planning history for archeological research
- ✅ Reduces noise when browsing the project

### CLI Help

Run `bd <command> --help` to see all available flags for any command.
For example: `bd create --help` shows `--parent`, `--deps`, `--assignee`, etc.

### Important Rules

- ✅ Use bd for ALL task tracking
- ✅ Always use `--json` flag for programmatic use
- ✅ Link discovered work with `discovered-from` dependencies
- ✅ Check `bd ready` before asking "what should I work on?"
- ✅ Store AI planning docs in `history/` directory
- ✅ Run `bd <cmd> --help` to discover available flags
- ❌ Do NOT create markdown TODO lists
- ❌ Do NOT use external issue trackers
- ❌ Do NOT duplicate tracking systems
- ❌ Do NOT clutter repo root with planning documents

For more details, see the bd documentation.
