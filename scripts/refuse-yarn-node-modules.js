const fs = require("fs");
// pnpm (with nodeLinker: hoisted) installs on top of a node_modules that yarn built, and leaves
// yarn's nested node_modules folders in place. Those stale nested packages shadow the ones in
// pnpm-lock.yaml and need dependencies that pnpm removed, e.g. a nested regexpu-core 5.3.2 that
// requires @babel/regjsgen, which breaks `lingui extract`.
if (fs.existsSync("node_modules/.yarn-integrity")) {
  console.error(
    "node_modules was installed by yarn. Delete the node_modules folder, then run `vp install` again.",
  );
  process.exit(1);
}
