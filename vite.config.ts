import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-electron-plugin";
import { customStart, loadViteEnv } from "vite-electron-plugin/plugin";
import renderer from "vite-plugin-electron-renderer";
import pkg from "./package.json";
import dsv from "@rollup/plugin-dsv";
import timeReporter from "vite-plugin-time-reporter";

export default defineConfig({
  resolve: {
    alias: {
      "@assets": path.resolve(__dirname, "./assets"),
      "package.json": path.resolve(__dirname, "./package.json")
    }
  },
  build: {
    emptyOutDir: true
  },
  plugins: [
    timeReporter(),
    react({
      babel: {
        // makes lingui macros work. There is a some performance penalty, but I
        //don't know how much. See https://github.com/skovhus/vite-lingui
        plugins: ["macros"]
        // I don't know why, but css props work without this or the 'macros' thing above
        //   plugins: ["@emotion/babel-plugin"],
      }
    }),
    electron({
      outDir: "dist",
      include: [
        "src/mainProcess/main",
        "src/other/locateDependency.ts",
        "src/mainProcess/MainProcessApi.ts",
        "src/mainProcess/preload",
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
        include: ["xml2js", "glob", "fs-extra", "graceful-fs"]
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
