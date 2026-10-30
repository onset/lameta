import { describe, it, expect } from "vitest";
import {
  isBetaVersion,
  parseSpellingWords,
  parseUninstallEntry,
  readPlistString,
  settingsWithoutLastProject,
  splitCommandLine
} from "./oldBeta";

// what `reg query` printed for a 3.0.21-beta installed for the current user
const regOutput = `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\1621d982-e759-5a01-8f55-f04f17f10a98
    DisplayName    REG_SZ    lameta 3.0.21-beta
    UninstallString    REG_SZ    "C:\\Users\\someone\\AppData\\Local\\Programs\\lameta\\Uninstall lameta.exe" /currentuser
    QuietUninstallString    REG_SZ    "C:\\Users\\someone\\AppData\\Local\\Programs\\lameta\\Uninstall lameta.exe" /currentuser /S
    DisplayVersion    REG_SZ    3.0.21-beta
    DisplayIcon    REG_SZ    C:\\Users\\someone\\AppData\\Local\\Programs\\lameta\\lameta.exe,0
    Publisher    REG_SZ    lameta
    NoModify    REG_DWORD    0x1
`;

describe("isBetaVersion", () => {
  it("accepts beta versions", () => {
    expect(isBetaVersion("3.0.21-beta")).toBe(true);
    expect(isBetaVersion("3.0.24-beta")).toBe(true);
  });
  it("never accepts a release, an alpha, or nothing", () => {
    expect(isBetaVersion("2.3.17")).toBe(false);
    expect(isBetaVersion("3.0.0")).toBe(false);
    expect(isBetaVersion("3.1.7-alpha")).toBe(false);
    expect(isBetaVersion("")).toBe(false);
    expect(isBetaVersion(undefined)).toBe(false);
  });
});

describe("parseUninstallEntry", () => {
  it("reads the version, the quiet uninstall command and the app's exe", () => {
    expect(parseUninstallEntry(regOutput)).toEqual({
      displayVersion: "3.0.21-beta",
      quietUninstallString:
        '"C:\\Users\\someone\\AppData\\Local\\Programs\\lameta\\Uninstall lameta.exe" /currentuser /S',
      exePath:
        "C:\\Users\\someone\\AppData\\Local\\Programs\\lameta\\lameta.exe"
    });
  });
  it("gives nothing when the key is missing", () => {
    expect(
      parseUninstallEntry(
        "ERROR: The system was unable to find the specified registry key or value."
      )
    ).toBeUndefined();
  });
  it("reads a release's version, which isBetaVersion then refuses", () => {
    const release = regOutput.replace(/3\.0\.21-beta/g, "2.3.17");
    expect(parseUninstallEntry(release)!.displayVersion).toBe("2.3.17");
    expect(isBetaVersion(parseUninstallEntry(release)!.displayVersion)).toBe(
      false
    );
  });
});

describe("splitCommandLine", () => {
  it("splits a quoted program from its arguments", () => {
    expect(
      splitCommandLine('"C:\\a b\\Uninstall lameta.exe" /currentuser /S')
    ).toEqual({
      file: "C:\\a b\\Uninstall lameta.exe",
      args: ["/currentuser", "/S"]
    });
  });
  it("splits an unquoted program", () => {
    expect(splitCommandLine("C:\\x\\u.exe /S")).toEqual({
      file: "C:\\x\\u.exe",
      args: ["/S"]
    });
  });
});

describe("readPlistString", () => {
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict>
  <key>CFBundleIdentifier</key>
  <string>com.github.lameta.lameta</string>
  <key>CFBundleShortVersionString</key>
  <string>3.0.24-beta</string>
</dict></plist>`;
  it("reads string values", () => {
    expect(readPlistString(plist, "CFBundleIdentifier")).toBe(
      "com.github.lameta.lameta"
    );
    expect(readPlistString(plist, "CFBundleShortVersionString")).toBe(
      "3.0.24-beta"
    );
  });
  it("gives nothing for a missing key", () => {
    expect(readPlistString(plist, "CFBundleDisplayName")).toBeUndefined();
  });
});

describe("parseSpellingWords", () => {
  it("leaves out the checksum line and blank lines", () => {
    expect(
      parseSpellingWords(
        "racorrding\r\nNgarrindjeri\r\n\r\nchecksum_v1 = 04ac\r\n"
      )
    ).toEqual(["racorrding", "Ngarrindjeri"]);
  });
});

describe("settingsWithoutLastProject", () => {
  it("keeps the settings but not the last project", () => {
    const result = JSON.parse(
      settingsWithoutLastProject(
        JSON.stringify({
          previousDirectory: "/Users/someone/Documents/lameta/x",
          email: "a@b.org",
          howUsing: "research"
        })
      )
    );
    expect(result).toEqual({ email: "a@b.org", howUsing: "research" });
  });
});
