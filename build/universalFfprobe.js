// electron-builder runs this before it packs each architecture (beforePack in electron-builder.json5).
//
// The Mac app is universal: electron-builder packs an x64 app and an arm64 app and merges them.
// ffmpeg-ffprobe-static downloads ffprobe for the architecture of the machine that ran the install,
// so both apps would carry the same single-architecture ffprobe, and the merge refuses it. This
// replaces it with a universal ffprobe made from both of the package's own downloads, which the
// merge accepts because mac.x64ArchFiles names it.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const archs = ["x64", "arm64"];
const lipoArchs = { x64: "x86_64", arm64: "arm64" };

exports.default = async function universalFfprobe(context) {
  if (context.electronPlatformName !== "darwin") {
    return;
  }
  const packageDir = path.dirname(require.resolve("ffmpeg-ffprobe-static/package.json"));
  const ffprobePath = path.join(packageDir, "ffprobe");
  const has = execFileSync("lipo", ["-archs", ffprobePath], { encoding: "utf8" }).trim().split(" ");
  if (archs.every((arch) => has.includes(lipoArchs[arch]))) {
    return;
  }

  const pkg = require(path.join(packageDir, "package.json"));
  const release = pkg["ffmpeg-static"]["binary-release-tag"];
  const slices = [];
  for (const arch of archs) {
    const url = `https://github.com/descriptinc/ffmpeg-ffprobe-static/releases/download/${release}/ffprobe-darwin-${arch}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Could not download ${url}: ${response.status}`);
    }
    const slicePath = path.join(packageDir, `ffprobe-darwin-${arch}`);
    fs.writeFileSync(slicePath, Buffer.from(await response.arrayBuffer()));
    slices.push(slicePath);
  }
  execFileSync("lipo", ["-create", ...slices, "-output", ffprobePath]);
  fs.chmodSync(ffprobePath, 0o755);
  slices.forEach((slicePath) => fs.rmSync(slicePath));
  console.log(`  • made a universal ffprobe  file=${ffprobePath}`);
};
