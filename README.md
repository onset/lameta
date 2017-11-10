
SayLess is reboot of SayMore as a web app wrapped in electron.

## Get Started

```bash
$ yarn
$ npm run dev
```


## Packaging

To package apps for the local platform:

```bash
$ npm run package
```

To package apps for all platforms:

First, refer to [Multi Platform Build](https://github.com/electron-userland/electron-builder/wiki/Multi-Platform-Build) for dependencies.

Then,
```bash
$ npm run package-all
```

To package apps with options:

```bash
$ npm run package -- --[option]
```

## Further commands


To run End-to-End Test

```bash
$ npm run build
$ npm run test-e2e
```

More information available in the upstream project: [electron-react-typescript-boilerplate](https://github.com/iRath96/electron-react-typescript-boilerplate)


## License
MIT
