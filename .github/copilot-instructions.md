Use vitest, not jest.
Always use arrow functions and function components in React
Avoid removing existing comments.
Avoid adding a comment like "// add this line".
If you think you might need access to another file, stop and ask me for it.

Style elements using the css macro from @emotion/react directly on the element being styled, using the css prop. E.g. `<div css={css`color:red`}>`
This project uses yarn 1.22.22
Never use npm commands
This project uses a bash terminal, so always use forward slashes in paths.
Use `yarn test` in a terminal to run unit tests. The "run_tests" tool often hangs.
Use `yarn e2e` in a terminal to run end-to-end tests. You can run a particular file with `yarn e2e <file-name>`.
If you make a change and e2e does not seem to reflect the change, try a console.log statement as a sanity check. If e2ebuildwatch is running, it should pick up the changes, but if it is not, you may need to run it or do a `yarn build`.

When doing debugging by writing temporary one-off code files in the terminal, remember not to leave them laying around.

When making test data, include things that could trip up code. Include things like spaces, slashes, and other characters that could cause issues with file names, URLs, IRIs. This is an app that deals in all human language scripts, so we have to test for a wide range of inputs and edge cases.

Fail Fast. Don't write code that silently works around failed dependencies. If a dependency is missing we should fail. Javascript itself will fail if we try to use a missing dependency, and that's fine. E.g. if you expect a foo to be defined, don't write "if(foo){}". Just use foo and if it's null, fine, we'll get an error, which is good.

When you summarize, if you had a problem you need me to solve, mark it with a ⚠️. If you have a question, mark it with a ❓.
