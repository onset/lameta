lameta (the Metadata Editor for Transparent Archiving) is a tool for Language Documentation.

# Mac & Windows Installers

Download [Installers](https://github.com/onset/lameta/releases)

# Linux Installer

n8marti has kindly created [a snap package](https://github.com/wasta-linux/lameta-snap)

# For Users

Learn more about this tool on its website: [https://www.lameta.org/](https://www.lameta.org/)

# For Developers

Stack: Typescript, React, mobx, vite, electron.

## Get Started

Install [Vite+](https://viteplus.dev/guide/).

On Windows, run:

```powershell
irm https://vite.plus/ps1 | iex
```

On macOS or Linux, run:

```bash
curl -fsSL https://vite.plus | bash
```

After installation, open a new shell and verify the CLI:

```bash
vp help
```

Vite+ supplies the Node version that `engines.node` in `package.json` names, and the pnpm version that `packageManager` names. You don't install either yourself.

```bash
vp install
vp run dev
```

Run `package.json` scripts with `vp run <script>`. You don't need a global `pnpm`.

If `vp env doctor` reports that `node` is "not vp shim", another Node install (for example Volta, or a Node.js installer in `C:\Program Files\nodejs`) comes before `~/.vite-plus/bin` on your PATH. Uninstall it or move it after `~/.vite-plus/bin`.

Common commands:

```bash
vp check
vp test
vp build
```

## Packaging

To package apps for the local platform:

```bash
vp run package
```

More information available in the upstream project:
[electron-react-typescript-boilerplate](https://github.com/iRath96/electron-react-typescript-boilerplate)

### unit tests

```bash
vp test
```

### e2e tests

We are using [playwright](https://playwright.dev/) with "experimental electron support". As of this writing, it does not appear to be possible to make use of the vite dev server for this. While playwright can point to an
arbitrary URL, the render process in electron is tied up with its own chromium browser and, in the case of electron, even has nodejs access. Therefore, e2e tests have to actually
run a built exe of lameta.

```bash
vp run e2ebuildwatch
vp run e2e
```

Note that at the time of this writing, playwright does not have a "watch" mode via command line, and the "ui" mode, which can watch, does not work with electron.

To run just one e2e fixture, name it:

```bash
vp run e2e registration.e2e.ts
```

If you see `ENOENT: no such file or directory, scandir "<path>\archive-configurations"`, you may have forgotten to do the `build` step.

To show the Playwright Inspector (which has a recorder), use

```bash
vp run e2erecord
```

### Publishing

#### Channels

lameta has three channels. Each one is published from its own branch:

| Branch    | Channel | Version looks like | Installs as    |
| --------- | ------- | ------------------ | -------------- |
| `master`  | alpha   | `4.0.12-alpha`     | `lameta alpha` |
| `beta`    | beta    | `4.0.53-beta`      | `lameta beta`  |
| `release` | release | `4.0.2`            | `lameta`       |

Each channel installs under its own name and app id, so one computer can have all three at
once. Each keeps its own settings folder, which means each has its own recent-projects list,
and they can all run at the same time.

On Windows, double-clicking a `.sprj` file opens it in whichever channel you installed or ran
last: installing lameta, and each time lameta starts, registers it as the program for `.sprj`
files. Uninstalling the channel that `.sprj` files open hands them to another installed
channel. On macOS, the system
chooses which installed channel opens a `.sprj` file; to change it, use Get Info on a `.sprj`
file, pick the app under "Open with", and click Change All.

#### Version numbers

You choose the first two parts of the version. To start 4.1, change the `version` in
`package.json` to `4.1.0` on the branch you will publish from, and commit. Nothing ever
changes those two parts for you.

The third part is worked out at publish time, separately for each channel: it is one more
than the highest GitHub release that the channel already has for that major.minor, counting
drafts, or 0 if it has none. A channel never looks at what the other branches have done. So
if beta has published up to `4.0.52-beta` and you merge `beta` into `release` and publish,
you get `4.0.0`, and the next beta is still `4.0.53-beta`.

Publishing writes the new version into `package.json` and commits it to the branch, so the
branch always shows the version it last published. Only the first two parts are read back.
When merging between branches, a conflict on that line can therefore be resolved either way.

To see what the next version from a branch will be:

```bash
gh release list --limit 1000 --json tagName -q ".[].tagName" > tags.txt
node scripts/nextVersion.mjs --branch beta --tags-file tags.txt
node scripts/nextVersion.mjs --latest --tags-file tags.txt   # newest of each channel
```

#### Publishing a version

Pushing to `master`, `beta` or `release` builds the Windows and Mac installers (a check that
the build works) but publishes nothing. To publish:

1. Make sure what you want to publish is pushed to the branch.
2. On GitHub, open Actions, choose **Build/publish**, click **Run workflow**, pick the branch,
   and optionally type the version you expect (for example `4.0.53-beta`). If you type one and
   the workflow works out a different one, it stops before changing anything. From a terminal,
   the same thing is:

   ```bash
   gh workflow run main.yml --ref beta -f version=4.0.53-beta
   ```

3. The workflow commits the new version to the branch, then builds the installers for Windows
   and Mac (Apple notarizes the Mac one; the Windows one is not signed), uploads them to a
   **draft** GitHub release tagged `v<version>`, and makes the Sentry release with the source
   maps (see `sentry.README.md`).
4. Pull the branch, to get the version commit before you push anything else.
5. Find the draft on the GitHub releases page and write its description. lameta's "Release
   Notes" dialog shows that description to users, so write it for them. The commits since the
   channel's previous release are a good starting point (a draft has no git tag yet, so end the
   range at the branch):

   ```bash
   git fetch --tags
   git log --no-merges --format="- %s" v4.0.52-beta..origin/beta
   ```

6. Publish the draft. Running copies of lameta find out about it the next time they start:
   a user hears about newer versions in their own channel, and an alpha or beta user also hears
   about versions of the steadier channels that were published after the one they are running.

## License

MIT
