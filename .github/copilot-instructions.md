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

- Keep the e2e tests clean by factoring out helper functions that are used across tests. See folderSearch-utilities.ts and e2eProject.ts for examples.

- try not to use time-based waiting that might fail on slower machines. Try to find some dom-based thing to tell you that that the screen is ready.

## What to do if you cannot figure out why an e2e test fails

- try adding a console.log() statement will give you the information you need to debug the issue. It will appear in the terminal.

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
