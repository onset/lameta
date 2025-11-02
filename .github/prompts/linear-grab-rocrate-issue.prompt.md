---
mode: agent
description: work on a linear issue
---

We are working on src/export/ROCrate. Tests are at src/export/ROCrate/**tests**. We are constrained by these specs: https://raw.githubusercontent.com/Language-Research-Technology/ldac-profile/refs/heads/master/profile/profile.md and https://www.researchobject.org/ro-crate/specification/1.2/structure.

Get an issue from linear that is assigned to you and is in "Planned" or "In Progress". Move it to "In Progress". Think about the problem and feel free to stop and ask me any clarifying questions.

# testing

Before you start, run all tests. If any fail, stop. As you work, run tests that you think are relevant. Once everythign passes, run all tests again.

# UI Problems

If the description seems to be about UI interactions, use e2e (playwright) tests, replicate the problem and then fix it.

# Committing

Run Prettier on every changed file (from the repo root run `yarn prettier --write path/to/changed-file`) and make sure your editor has saved everything. Stage all code changes, commit with a message referencing the issue key (e.g. "Ro-crate #3: rerouted the power couplings"). Do not push.

# Finishing

When you're done add a comment to the ticket telling what you did and letting me know if there are any further problems. If you were able to succeed, move the issue to the "Code Review" status. Before you are done, assign the issue back to me (@hattonjohn). Finally, if you created any temp files, delete them.
