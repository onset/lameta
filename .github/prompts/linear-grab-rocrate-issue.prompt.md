---
mode: agent
description: work on a linear issue
---

We are working on src/export/ROCrate. Tests are at src/export/ROCrate/**tests**. We are constrained by these specs: https://raw.githubusercontent.com/Language-Research-Technology/ldac-profile/refs/heads/master/profile/profile.md and https://www.researchobject.org/ro-crate/specification/1.2/structure.

Ask linear for at least one the issue assigned to you (your user name is "agent") and where status = "Planned" or "In Progress". Pick one and move it to "In Progress". Think about the problem and feel free to stop and ask me any clarifying questions.

# testing

Before you start, run all tests. If any fail, stop. As you work, run tests that you think are relevant. Once everythign passes, run all tests again.

# UI Problems

If the description seems to be about UI interactions, use e2e (playwright) tests, replicate the problem and then fix it.

# Committing

Run Prettier on every changed file (from the repo root run `yarn prettier --write path/to/changed-file`) and make sure your editor has saved everything. Stage all code changes, commit with a message referencing the problem number from the report.md document and issue key from linear (e.g. "Ro-crate #3 / LAM-43 rerouted the power couplings"). Do not push.

# Add comment to ticket

When you're done add a comment to the ticket telling what you did. Directly address the original feedback from the user, showing what json used to be produced compared to what is produced now, or in some other way directly explain what has change. Make a note there with a ⚠️ if there there are any further problems. If you were able to succeed, move the issue to the "Code Review" status. Before you are done, assign the issue back to me (@hattonjohn).

# Cleanup

Finally, if you created any temp files, delete them.
