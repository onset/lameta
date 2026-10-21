---
name: publish
description: Publish a new lameta version from the current branch, with confirmation of the version and draft release notes.
disable-model-invocation: true
---

# Publish lameta

The process, the channels and the numbering rules are in `README.md`, "Publishing". Read
that section first; this skill runs it, with a confirmation and release notes added. Invoking
the skill authorizes the workflow run in step 5, the pull in step 6 and the release edits in
steps 7 and 8. `<scratch>` below is any temporary folder outside the repo.

## 1. Branch

`git rev-parse --abbrev-ref HEAD` must be `master`, `beta` or `release`. If it is another
branch, tell the user which branches publish and stop.

## 2. Clean and pushed

`git status --short` must be empty, and after `git fetch origin`, `HEAD` must equal
`origin/<branch>`. If the tree is dirty, list the changes and stop: the user commits. If the
branch is ahead or behind, say so and stop. CI builds the remote branch, so a local commit
would not be in the build.

## 3. Show the current versions and propose the next

```bash
gh release list --limit 1000 --json tagName -q ".[].tagName" > <scratch>/tags.txt
node scripts/nextVersion.mjs --latest --tags-file <scratch>/tags.txt
node scripts/nextVersion.mjs --branch <branch> --tags-file <scratch>/tags.txt
```

Also run `gh release list --limit 10` to show which of those are drafts. Then confirm with the
user (use `AskUserQuestion`): show the newest version of each channel, saying which are
still drafts, then the version this publish will make, and the major.minor in `package.json`
that it comes from. Offer to publish it or stop. If the user wants a different major.minor,
stop: they change `package.json` and commit it, then run the skill again.

## 4. Draft the release notes

Find the channel's previous release: the highest tag of this channel in `tags.txt`. Run
`git fetch --tags` and list the commits since it:
`git log --no-merges --format="%h %s%n%b" <previous tag>..HEAD`. If that tag has no git tag
(it is still a draft), say so and use the commits since the newest published tag of the
channel.

Write the notes in Markdown for lameta's users, not its developers: the "Release Notes"
dialog shows them in the app. Group them under short headings (new, changed, fixed), one line
for each change a user could notice. Leave out refactors, tests, build and CI changes. Save
them to `<scratch>/release-notes-<version>.md`.

## 5. Run the workflow

```bash
gh workflow run main.yml --ref <branch> -f version=<version>
```

Find the run with `gh run list --workflow=main.yml --branch <branch> --event workflow_dispatch --limit 1`
(it takes a few seconds to appear), then `gh run watch <id> --exit-status`. On failure, show
`gh run view <id> --log-failed`, summarize the failing step, and stop. A failure in the Sentry
step still leaves a draft with the installers; say that.

## 6. Pull the version commit

`git pull --ff-only`. The workflow committed the new version to the branch.

## 7. Put the notes on the draft

`gh release edit v<version> --notes-file <scratch>/release-notes-<version>.md`

## 8. Report and offer to publish

Tell the user the release is a **draft** that no user can see yet. Show its URL
(`gh release view v<version> --json url -q .url`) and the full release notes. Then ask (use
`AskUserQuestion`) whether to publish it now or leave it as a draft so that they can edit the
notes on GitHub. On "publish", run `gh release edit v<version> --draft=false` and report the
URL.
