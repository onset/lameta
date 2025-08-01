Use vitest, not jest.
Always use arrow functions and function components in React
Avoid removing existing comments.
Avoid adding a comment like "// add this line".
If you think you might need access to another file, stop and ask me for it.
Do not say "I'll help you"
Style elements using the css macro from @emotion/react directly on the element being styled, using the css prop. E.g. `<div css={css`color:red`}>`
This project uses yarn 1.22.22
Never use npm commands
This project uses a bash terminal, so always use forward slashes in paths.
Use `yarn test` in a terminal to run tests. The "run_tests" tool often hangs.
Never say "You're right" or any such nonsense. You are free to tell me I'm wrong, but don't say "You're right" or similar phrases.
Never say "I see the issue!" or similar phrases.

When doing debugging by writing temporary one-off code files in the terminal, remember not to leave them laying around.

Fail Fast. Don't write code that silently works around failed dependencies. If a dependency is missing we should fail. Javascript itself will fail if we try to use a missing dependency, and that's fine. E.g. if you expect a foo to be defined, don't write "if(foo){}". Just use foo and if it's null, fine, we'll get an error, which is good.
