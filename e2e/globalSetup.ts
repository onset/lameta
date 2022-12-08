import * as fs from "fs";
import * as Path from "path";
import * as os from "os";
import { FullConfig } from "@playwright/test";

export default async function globalSetup(config: FullConfig) {
  const allTimeRoot = Path.join(os.tmpdir(), "lametae2e");
  //fs.rmdirSync(allTimeRoot, { recursive: true });
  const rootDir = Path.join(
    allTimeRoot,
    new Date().toISOString().replace(/\:/g, "_")
  );
  // clear out anything still in there. It won't hurt, but it's nice to free up the space
  // note that we're not trying to clean up after each test, as this way it's easier to
  // inspect what happened and we don't get leftovers around from crashes or whatever.
  fs.mkdirSync(rootDir, { recursive: true });
  process.env.E2ERoot = rootDir;
}
