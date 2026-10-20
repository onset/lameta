// Works out the version that the next publish from a branch gets.
//
// Each branch publishes to one channel. The person publishing controls the first two parts
// of the version by editing package.json; the third part counts the GitHub releases already
// made in that channel for that major.minor, so a channel never needs to know what the other
// branches have done.
//
// Used by .github/workflows/main.yml and by the publish skill. No dependencies, so CI can run
// it before `yarn install`.
//
//   node scripts/nextVersion.mjs --branch beta --tags-file tags.txt
//   node scripts/nextVersion.mjs --branch beta --tags-file tags.txt --latest
//
// tags.txt holds one GitHub release tag per line, drafts included (`gh release list`).
// --latest prints the newest tag of each channel instead of the next version.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const channelForBranch = {
  master: "alpha",
  beta: "beta",
  release: "release",
  "channel-versioning": "beta" // TEMPORARY: for testing the workflow
};

// "release" has no suffix: 4.0.0. The others do: 4.0.53-beta.
export function formatVersion(major, minor, patch, channel) {
  const base = `${major}.${minor}.${patch}`;
  return channel === "release" ? base : `${base}-${channel}`;
}

// Returns undefined for a tag that follows none of the channel patterns.
export function parseTag(tag) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(tag.trim());
  if (!match) return undefined;
  const [, major, minor, patch, prerelease] = match;
  let channel;
  if (prerelease === undefined) channel = "release";
  else if (prerelease.startsWith("alpha")) channel = "alpha";
  else if (prerelease.startsWith("beta")) channel = "beta";
  else return undefined;
  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    channel
  };
}

// packageVersion is whatever package.json holds; only its first two parts are read.
export function nextVersion(packageVersion, channel, tags) {
  const match = /^(\d+)\.(\d+)/.exec(packageVersion);
  if (!match) {
    throw new Error(
      `package.json version "${packageVersion}" does not start with major.minor`
    );
  }
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patches = tags
    .map(parseTag)
    .filter(
      (t) =>
        t && t.channel === channel && t.major === major && t.minor === minor
    )
    .map((t) => t.patch);
  const patch = patches.length ? Math.max(...patches) + 1 : 0;
  return formatVersion(major, minor, patch, channel);
}

// The highest-numbered tag of each channel, for showing the person what already exists.
export function latestByChannel(tags) {
  const latest = {};
  for (const tag of tags) {
    const t = parseTag(tag);
    if (!t) continue;
    const best = latest[t.channel];
    if (
      !best ||
      t.major > best.major ||
      (t.major === best.major && t.minor > best.minor) ||
      (t.major === best.major &&
        t.minor === best.minor &&
        t.patch > best.patch)
    ) {
      latest[t.channel] = { ...t, tag: tag.trim() };
    }
  }
  return Object.fromEntries(
    Object.entries(latest).map(([channel, t]) => [channel, t.tag])
  );
}

function main(argv) {
  const arg = (name) => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const tagsFile = arg("--tags-file");
  if (!tagsFile) throw new Error("--tags-file is required");
  const tags = readFileSync(tagsFile, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim());

  if (argv.includes("--latest")) {
    console.log(JSON.stringify(latestByChannel(tags), null, 2));
    return;
  }

  const branch = arg("--branch");
  const channel = channelForBranch[branch];
  if (!channel) {
    throw new Error(
      `Branch "${branch}" does not publish. Publish from one of: ${Object.keys(
        channelForBranch
      ).join(", ")}.`
    );
  }
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
  console.log(nextVersion(packageJson.version, channel, tags));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
