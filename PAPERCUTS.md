# Papercuts

Short notes about friction and traps in this repo. Append; do not rewrite.

## A failed pre-commit hook during a merge in a linked worktree loses the merge (2026-10-21)

The first failed run deleted `MERGE_HEAD`, `MERGE_MSG` and `MERGE_MODE` from
`.git/worktrees/<name>/`, staged its formatting changes while reporting that it had reverted
them, and the next run stopped at "Failed to back up original state". After a failed hook
during a merge, check `git status` for "still merging" and compare `git write-tree` against the
expected result before you try again.
