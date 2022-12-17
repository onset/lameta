lameta (the Metadata Editor for Transparent Archiving) is a tool for Language Documentation.

# Mac & Windows Installers

Download [Installers](https://github.com/onset/lameta/releases)

# For Users

Learn more about this tool on its website: [https://www.lameta.org/](https://www.lameta.org/)
lameta was previously known as SayMoreX.

# For Developers

Stack: Typescript, React, mobx, webpack, electron.

## Get Started

Install node & yarn then

```bash
yarn
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

If you see something like `TypeError: beforeAll is not a function`, that is caused by explicitly defining of the jest functions, as in `const { describe, it, beforeEach, afterEach } = require("jest");` Just remove that.

### e2e tests

Now using [playwright](https://playwright.dev/)

```bash
yarn e2e
```

(TODO: There are still old spectron tests around, these need to get cleared out.)

### l10n

When running lameta, if you see this in the Chrome debug console:

`Uncaught Error: Cannot find module './en/messages.js'`

then you need to do `yarn lingui-compile`.

## License

MIT
