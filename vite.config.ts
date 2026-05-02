import path from "node:path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite-plus";
//import react from "@vitejs/plugin-react-swc";
import react from "@vitejs/plugin-react";
import electron from "vite-electron-plugin";
import { customStart, loadViteEnv } from "vite-electron-plugin/plugin";
import renderer from "vite-plugin-electron-renderer";
import dsv from "@rollup/plugin-dsv";
import { copyFileSync, mkdirSync } from "fs";

const devServerUrl = new URL("http://127.0.0.1:7777");
const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  staged: {
    "*": "vp check --fix"
  },
  fmt: {},
  lint: {
    ignorePatterns: ["dist", "locale/"],
    options: {
      typeAware: true,
      typeCheck: true
    }
  },
  resolve: {
    alias: {
      path: "node:path",
      "@assets": path.resolve(rootDir, "./assets"),
      "@mui/system/createStyled": path.resolve(
        rootDir,
        "./node_modules/@mui/system/esm/createStyled.js"
      ),
      "package.json": path.resolve(rootDir, "./package.json")
    }
  },
  build: {
    emptyOutDir: true,
    rollupOptions: {
      external: ["ts-node"]
    }
  },
  plugins: [
    // Custom plugin to copy vocabulary files to dist/vocabularies
    {
      name: "copy-vocabularies",
      buildStart() {
        // Ensure the vocabularies directory exists
        mkdirSync("dist/vocabularies", { recursive: true });

        // Copy vocabulary files
        copyFileSync(
          "src/model/Project/Session/genres.json",
          "dist/vocabularies/genres.json"
        );
      }
    },
    //lingui(),
    react({
      // TODO: linguijs V4 will allow us to get rid of babel and use swc, using
      //plugins: [["@lingui/swc-plugin", {}]],
      // and then we can import the po files directly instead of having to compile js files
      babel: {
        // makes lingui macros work. There is a some performance penalty, but I
        //don't know how much. See https://github.com/skovhus/vite-lingui
        plugins: ["macros"]
      }
    }),
    electron({
      outDir: "dist",
      include: [
        "src/mainProcess/main",
        "src/mainProcess/launchTest.ts",
        "src/other/locateDependency.ts",
        "src/other/spellCheckLanguages.ts",
        "src/mainProcess/MainProcessApi.ts",
        "src/mainProcess/MainProcessCopyManager.ts",
        "src/mainProcess/MainProcessImdiExport.ts",
        "src/mainProcess/preload/index.ts",
        "src/mainProcess/validateImdi.ts",
        "src/getTestEnvironment.ts"
      ],
      transformOptions: {
        sourcemap: !!process.env.VSCODE_DEBUG
      },
      plugins: [
        ...(process.env.VSCODE_DEBUG
          ? [
              // Will start Electron via VSCode Debug
              customStart(
                debounce(() =>
                  console.log(
                    /* For `.vscode/.debug.script.mjs` */ "[startup] Electron App"
                  )
                )
              )
            ]
          : []),
        // Allow use `import.meta.env.VITE_SOME_KEY` in Electron-Main
        loadViteEnv()
      ]
    }),
    // Use Node.js API in the Renderer-process
    renderer({
      nodeIntegration: true,
      optimizeDeps: {
        include: ["xml2js", /*"glob",*/ "fs-extra", "graceful-fs"]
      }
    }),
    dsv() // for importing csv
  ],
  server: process.env.VSCODE_DEBUG
    ? {
        host: devServerUrl.hostname,
        port: +devServerUrl.port
      }
    : undefined,
  clearScreen: false
});

function debounce<Fn extends (...args: any[]) => void>(fn: Fn, delay = 299) {
  let t: NodeJS.Timeout;
  return ((...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  }) as Fn;
}
