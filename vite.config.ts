import path from "path";
import { defineConfig } from "vite";
//import react from "@vitejs/plugin-react-swc";
import react from "@vitejs/plugin-react";
import electron from "vite-electron-plugin";
import { customStart, loadViteEnv } from "vite-electron-plugin/plugin";
import renderer from "vite-plugin-electron-renderer";
import pkg from "./package.json";
import dsv from "@rollup/plugin-dsv";
import { copyFileSync, mkdirSync } from "fs";

export default defineConfig({
  resolve: {
    alias: {
      "@assets": path.resolve(__dirname, "./assets"),
      "package.json": path.resolve(__dirname, "./package.json")
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
        "src/other/locateDependency.ts",
        "src/mainProcess/MainProcessApi.ts",
        "src/mainProcess/preload/index.ts",
        "src/mainProcess/validateImdi.ts"
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
    ? (() => {
        const url = new URL(pkg.debug.env.VITE_DEV_SERVER_URL);
        return {
          host: url.hostname,
          port: +url.port
        };
      })()
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
