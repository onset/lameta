lameta (the Metadata Editor for Transparent Archiving) is a tool for Language Documentation.

# Mac & Windows Installers

Download [Installers](https://github.com/onset/lameta/releases)

# Linux Installer

n8marti has kindly created [a snap package](https://github.com/wasta-linux/lameta-snap)

# For Users

Learn more about this tool on its website: [https://www.lameta.org/](https://www.lameta.org/)
lameta was previously known as SayMoreX.

# For Developers

Stack: Typescript, React, mobx, webpack, electron.

## Get Started

Make sure [volta](https://github.com/volta-cli/volta) is installed. Verify that it is working correctly via `volta list`. You should see the same versions of node & yarn as are listed in `packages.json`.

```bash
yarn
yarn lingui compile  <-- just once, before dev will work
yarn dev
```

## Packaging

To package apps for the local platform:

```bash
yarn package
```

More information available in the upstream project:
[electron-react-typescript-boilerplate](https://github.com/iRath96/electron-react-typescript-boilerplate)

### unit tests

```bash
yarn test
```

### e2e tests

We are using [playwright](https://playwright.dev/) with "experimental electron support". As of this writing, it does not appear to be possible to make use of the vite dev server for this. While playwright can point to an
arbitrary URL, the render process in electron is tied up with its own chromium browser and, in the case of electron, even has nodejs access. Therefore, e2e tests have to actually
run a built exe of lameta.

```bash
yarn vite build --watch
yarn e2e
```

Note that at the time of this writing, playwright does not have a "watch" mode via command line, and the "ui" mode, which can watch, does not work with electron.

To run just one e2e fixture, name it:

```bash
yarn e2e registration.e2e.ts
```

If you see `ENOENT: no such file or directory, scandir "<path>\archive-configurations"`, you may have forgotten to do the `build` step.

### l10n

When running lameta, if you see this in the Chrome debug console:

`Uncaught Error: Cannot find module './en/messages.js'`

then you need to do `yarn lingui-compile`.

### Publishing a new release

The current process, which I don't love, is this:

1. Change the version in `package.json`
2. Commit.
3. Add a tag matching that number, e.g. v2.3.4-beta
4. push the commit and tag. The GitHub Action in main.yml will run if you are on one of the branches listed there. It will build installers for Mac and Windows, get Apple to notarize the mac version, and create an unpublished "Release" on github. We do not currently have a way of "signing" the Windows version.
5. Find that release, type in the description, and publish it.

## License

MIT
