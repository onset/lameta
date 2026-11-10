import { ChecksOfConfiguration, mergeChecks } from "../../problems/checkSettings";

export type OtherConfigurationSettings = {
  configurationFullName: string;
  archiveUsesImdi: boolean;
  archiveUsesParadisec: boolean;
  showRoCrate: boolean;
  fileNameRules: "ASCII" | "unicode";
  // IMDI schema file name. Defaults to "IMDI_3.0.xsd".
  // Archives can specify an alternative schema.
  imdiSchema: string;
  // The export formats that are refused while lameta's checks find problems, as the
  // Export dialog names them: "csv", "paradisec", "imdi", "opex-plus-files",
  // "ro-crate". Warnings do not refuse an export.
  exportFormatsBlockedByProblems?: string[];
  // The checks of src/problems/lametaChecks.ts that are on, with their settings; see
  // src/problems/checkSettings.ts
  checks?: ChecksOfConfiguration;
};

// A configuration's settings over lameta's own (archive-configurations/lameta). Its
// `checks` add to lameta's list of checks instead of replacing it.
export function mergeConfigurationSettings(
  base: OtherConfigurationSettings,
  settings: Partial<OtherConfigurationSettings>,
): OtherConfigurationSettings {
  return { ...base, ...settings, checks: mergeChecks(base.checks, settings.checks) };
}

let otherConfigurationSettings: OtherConfigurationSettings = {
  configurationFullName: "",
  archiveUsesImdi: false,
  archiveUsesParadisec: false,
  showRoCrate: false,
  fileNameRules: "ASCII",
  imdiSchema: "IMDI_3.0.xsd",
};

export function SetOtherConfigurationSettings(settings: OtherConfigurationSettings) {
  otherConfigurationSettings = settings;
}
export function GetOtherConfigurationSettings(): OtherConfigurationSettings {
  return otherConfigurationSettings;
}
export function resetOtherConfigurationSettings() {
  otherConfigurationSettings = {
    archiveUsesImdi: false,
    archiveUsesParadisec: false,
    showRoCrate: false,
    configurationFullName: "",
    fileNameRules: "ASCII",
    imdiSchema: "IMDI_3.0.xsd",
  };
}
