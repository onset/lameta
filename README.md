SayMore X is a reboot of SayMore (c# winforms) as a web app wrapped in electron, so that it can be used on Macs (and Windows, and Linux). The stack is Typescript, react, and mobx, ,built with webpack.

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

## License

MIT
