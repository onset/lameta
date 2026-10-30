// Betas used to install as "lameta", the same name and app id as a release. Now a beta installs
// as "lameta beta", beside any release. These find a beta that is still installed under the old
// name, so that the new beta can take over its settings and remove it (replaceOldBeta.ts).
//
// Nothing here may ever pick out a release: a release also installs as "lameta", with the same
// app id, so it is told apart only by its version.

// electron-builder names the Windows uninstall entry after the app id (com.github.lameta.lameta)
export const kOldUninstallKeyName = "1621d982-e759-5a01-8f55-f04f17f10a98";
export const kOldAppId = "com.github.lameta.lameta";
// the settings that lameta itself keeps; the other files in the folder belong to Chromium
export const kSettingsFileName = "lameta-user-settings.json";
export const kSpellingWordsFileName = "Custom Dictionary.txt";

export function isBetaVersion(version: string | undefined): boolean {
  return !!version && /^\d+\.\d+\.\d+-beta/.test(version.trim());
}

export type WindowsUninstallEntry = {
  displayVersion: string;
  quietUninstallString: string;
  exePath: string;
};

// Reads the output of `reg query <uninstall key>`
export function parseUninstallEntry(
  regOutput: string
): WindowsUninstallEntry | undefined {
  const value = (name: string) => {
    const match = new RegExp(`^\\s*${name}\\s+REG_\\w+\\s+(.*)$`, "m").exec(
      regOutput
    );
    return match ? match[1].trim() : undefined;
  };
  const displayVersion = value("DisplayVersion");
  const quietUninstallString = value("QuietUninstallString");
  const displayIcon = value("DisplayIcon");
  if (!displayVersion || !quietUninstallString || !displayIcon)
    return undefined;
  // DisplayIcon is the app's exe, with ",0" after it
  const exePath = displayIcon.replace(/,\d+$/, "").replace(/^"|"$/g, "");
  return { displayVersion, quietUninstallString, exePath };
}

// Splits `"C:\...\Uninstall lameta.exe" /currentuser /S` into the program and its arguments
export function splitCommandLine(
  commandLine: string
): { file: string; args: string[] } | undefined {
  const match = /^\s*(?:"([^"]+)"|(\S+))\s*(.*)$/.exec(commandLine);
  if (!match) return undefined;
  const file = match[1] ?? match[2];
  const args = match[3].split(/\s+/).filter((a) => a.length > 0);
  return { file, args };
}

// Reads a value from the XML Info.plist that electron-builder writes into a Mac app
export function readPlistString(
  plistXml: string,
  key: string
): string | undefined {
  const match = new RegExp(
    `<key>${key}</key>\\s*<string>([^<]*)</string>`
  ).exec(plistXml);
  return match ? match[1] : undefined;
}

// The old beta's settings, minus the project it had open last. Those settings are in the
// folder that a release of lameta also uses, so that project may be one opened in a release,
// and a beta should not open it by itself.
export function settingsWithoutLastProject(settingsJson: string): string {
  const settings = JSON.parse(settingsJson);
  delete settings.previousDirectory;
  return JSON.stringify(settings, null, "\t");
}

// The words someone added to the spell checker, from Chromium's "Custom Dictionary.txt",
// whose last line is a checksum
export function parseSpellingWords(dictionaryText: string): string[] {
  return dictionaryText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("checksum_v1"));
}
