---
mode: agent
description: work on a linear issue
---

We are working on src/export/ROCrate. Tests are at src/export/ROCrate/**tests**. We are constrained by these specs: https://raw.githubusercontent.com/Language-Research-Technology/ldac-profile/refs/heads/master/profile/profile.md and https://www.researchobject.org/ro-crate/specification/1.2/structure.

Ask linear for at least one the issue assigned to you (your user name is "agent") and where status = "Planned" or "In Progress". Pick one and move it to "In Progress". Think about the problem and feel free to stop and ask me any clarifying questions.

You may only edit files in src/export/ROCrate and its subdirectories. You may also create temporary files as needed, but delete them when done.

When you have a plan, write it out here. Once I approve the plan, start work. Follow the instructions below carefully.

# Code Comments

By nature of us getting this wrong the first time, we should makes sure to explain in code comments what the problem was and how we fixed it. Include a url to the linear issue in such comments. There should be an explicit comment like this in the tests, but also in the code itself where relevant. However, use some judgment. Don't just put the same comment 13 different places.

# testing

Before you start, run `yarn test:rocrate`. If any fail, stop. As you work, run tests that you think are relevant. Once everything passes, run `yarn test:rocrate` again.

# UI Problems

If the description seems to be about UI interactions, use e2e (playwright) tests, replicate the problem and then fix it.

# Committing

Run Prettier on every changed file (from the repo root run `yarn prettier --write path/to/changed-file`) and make sure your editor has saved everything. Stage all code changes, commit with a message referencing the problem number from the report.md document and issue key from linear (e.g. "Ro-crate #3 / LAM-43 rerouted the power couplings"). Add the URL of the linear issue to the commit description. Explicitly say if you ran tests and what the results were. Add a summary of the change to the description. Do not push.

ABSOLUTELY NEVER run destructive git operations (e.g., git reset --hard, rm, git checkout/git restore to an older commit) unless the user gives an explicit, written instruction in this conversation. Treat these commands as catastrophic; if you are even slightly unsure, stop and ask before touching them. (When working within Cursor or Codex Web, these git limitations do not apply; use the tooling's capabilities as needed.)
Never use git restore (or similar commands) to revert files you didn't author—coordinate with other agents instead so their in-progress work stays intact.

Always double-check git status before any commit. Make sure you ran prettier on every changed file.

Keep commits atomic: commit only the files you touched and list each path explicitly. For tracked files run git commit -m "<scoped message>" -- path/to/file1 path/to/file2. For brand-new files, use the one-liner git restore --staged :/ && git add "path/to/file1" "path/to/file2" && git commit -m "<scoped message>" -- path/to/file1 path/to/file2.
Quote any git paths containing brackets or parentheses (e.g., src/app/[candidate]/\*\*) when staging or committing so the shell does not treat them as globs or subshells.

# Add comment to ticket

When you're done add a comment to the ticket telling what you did. Directly address the original feedback from the user, showing what json used to be produced compared to what is produced now, or in some other way directly explain what has change. Make a note there with a ⚠️ if there there are any further problems. If you made commit, add its SHA to the comment. If you were able to succeed, move the issue to the "Code Review" status. Assign the issue back to me (@hattonjohn).

# Cleanup

Finally, if you created any temp files, delete them.

# Keep Going

THere is already an apprroved plan in the linear ticket, so unless you have questions or doubts, just start working on the plan, don't wait.
