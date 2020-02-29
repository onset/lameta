laMeta (the Metadata Editor for Transparent Archiving) is a tool for Language Documentation. 

# Mac & Windows Installers

Download [Installers](https://github.com/onset/laMETA/releases)

# For Developers

Stack: Typescript, React, mobx, webpack, electron.

## Get Started

Install node, yarn, then

```bash
$ yarn
$ yarn lingui-compile
$ yarn dev
```

## Packaging

To package apps for the local platform:

```bash
$ npm run package
```

To package apps for all platforms:

First, refer to
[Multi Platform Build](https://www.electron.build/multi-platform-build) for
dependencies.

Then,

```bash
$ npm run package-all
```

To package apps with options:

```bash
$ npm run package -- --[option]
```

More information available in the upstream project:
[electron-react-typescript-boilerplate](https://github.com/iRath96/electron-react-typescript-boilerplate)

## Troubleshooting

### unit tests

When running e2e tests, there is occasionally a mystery error that won't go away, even if you got back to previous commits were unit tests were running. It goes away with a restart, `git clean -dxf && yarn && yarn test`. Make sure everything is committed first!

If you see something like `TypeError: beforeAll is not a function`, that is caused by explicitly defining of the jest functions, as in `const { describe, it, beforeEach, afterEach } = require("jest");` Just remove that.

### l10n

When running laMeta, if you see this in the Chrome debug console:

`Uncaught Error: Cannot find module './en/messages.js'`

then you need to do `yarn lingui-compile`.

## License

MIT
