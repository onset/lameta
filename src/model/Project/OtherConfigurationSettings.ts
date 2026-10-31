import type { ProblemSeverity } from "../../problems/rulesFile";

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
  // The severity of a check in src/problems/lametaChecks.ts, by its check id, where this
  // configuration wants a different severity from the check's own, e.g.
  // { languageNameVariations: "error" }
  checkSeverities?: Record<string, ProblemSeverity>;
};

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
