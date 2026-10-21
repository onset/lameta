import { execFile } from "child_process";

// Alpha, beta and release can be installed side by side, and double-clicking a .sprj file
// should open it in whichever of them the user ran last. Every channel's installer registers
// .sprj under the same file class (build/installer.nsh), so each launch points that class's
// open command at the running exe.
//
// Writing to HKCU needs no admin rights, and HKCU wins over an HKLM registration from a
// per-machine install. This does not override a user who picked a different program with
// "Open with > Always use this app".
const fileClass = "lameta/lameta project";

export function claimSprjFiles(exePath: string): void {
  const classKey = `HKCU\\Software\\Classes\\${fileClass}`;
  const writes: [key: string, value: string][] = [
    ["HKCU\\Software\\Classes\\.sprj", fileClass],
    [`${classKey}\\DefaultIcon`, `"${exePath}",0`],
    [`${classKey}\\shell\\open\\command`, `"${exePath}" "%1"`],
  ];
  for (const [key, value] of writes) {
    execFile("reg", ["add", key, "/ve", "/d", value, "/f"], (error) => {
      if (error) console.error(`Could not register .sprj files: ${error.message}`);
    });
  }
}
