import fs from "fs";
import * as Path from "path";
import * as os from "os";

export default async function globalSetup() {
  if (!process.env.E2E_LAMETA_APP_DIR) failIfDistIsStale(Path.resolve(__dirname, ".."));

  const allTimeRoot = Path.join(os.tmpdir(), "lametae2e");
  //fs.rmdirSync(allTimeRoot, { recursive: true });
  const rootDir = Path.join(allTimeRoot, new Date().toISOString().replace(/:/g, "_"));
  // clear out anything still in there. It won't hurt, but it's nice to free up the space
  // note that we're not trying to clean up after each test, as this way it's easier to
  // inspect what happened and we don't get leftovers around from crashes or whatever.
  fs.mkdirSync(rootDir, { recursive: true });
  process.env.E2ERoot = rootDir;

  // Minimal fix for noisy 'Failed to load resource: net::ERR_FILE_NOT_FOUND' messages in e2e:
  // The renderer uses <img src="assets/..."> paths. In the packaged build these resolve because
  // electron loads from a directory that contains an 'assets' folder. During e2e we only run a Vite
  // build that outputs dist/ without copying ./assets into dist/assets, so file://.../dist/assets/... 404s.
  // Instead of changing build config or every <img>, just copy the assets tree once before tests.
  try {
    const projectRoot = Path.resolve(__dirname, "..");
    const appRoot = process.env.E2E_LAMETA_APP_DIR || projectRoot;
    const srcAssets = Path.join(projectRoot, "assets");
    const distAssets = Path.join(appRoot, "dist", "assets");
    if (fs.existsSync(srcAssets)) {
      copyRecursive(srcAssets, distAssets);
    }
  } catch (e) {
    // Failing loudly would break tests; logging is enough because missing assets only affect icons.
    console.error("Failed to copy assets for e2e", e);
  }

  // Suppress verbose debug logging in e2e runs while keeping warnings/errors/info visible.
  // We keep the option to re-enable by setting E2E_DEBUG=1 if needed for a specific investigation.
  if (process.env.E2E && process.env.E2E_DEBUG !== "1") {
    const noop = () => {};
    (console as any).debug = noop;
  }
}

// The suite drives the app in dist/, and nothing here builds it, so a source edit has no
// effect until `pnpm run build`.
function failIfDistIsStale(projectRoot: string) {
  const builtApp = Path.join(projectRoot, "dist", "index.html");
  if (!fs.existsSync(builtApp)) {
    throw new Error("dist/ has no build. Run `pnpm run build` before the e2e tests.");
  }
  const builtAt = fs.statSync(builtApp).mtimeMs;
  const newer = ["src", "locale"]
    .map((dir) => findFileNewerThan(Path.join(projectRoot, dir), builtAt))
    .find((path) => path);
  if (newer) {
    throw new Error(
      `${Path.relative(projectRoot, newer)} changed after the last build, so the e2e tests would ` +
        "run the old app. Run `pnpm run build` first.",
    );
  }
}

function findFileNewerThan(dir: string, time: number): string | undefined {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const path = Path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findFileNewerThan(path, time);
      if (found) return found;
    } else if (!entry.name.endsWith(".spec.ts") && fs.statSync(path).mtimeMs > time) {
      return path;
    }
  }
  return undefined;
}

function copyRecursive(src: string, dest: string) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(Path.join(src, entry), Path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}
