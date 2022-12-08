const fs = require("fs");
// occasionally electron-builder dies on windows because it doesn't fully erase sample files in the existing dir...
console.log("removing the ./release directory.");
fs.rmSync("./release", { recursive: true, force: true });
if (process.platform === "win32") {
  console.log(
    "removing the electron-builder cache directory. Occasionally it gets messed up on windows"
  );
  fs.rmSync(`${process.env.USERPROFILE}/AppData/Local/electron-builder/Cache`, {
    recursive: true,
    force: true,
  });
}
