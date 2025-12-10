export type OtherConfigurationSettings = {
  configurationFullName: string;
  archiveUsesImdi: boolean;
  archiveUsesParadisec: boolean;
  showRoCrate: boolean;
  fileNameRules: "ASCII" | "unicode";
  // IMDI schema file name. Defaults to "IMDI_3.0.xsd".
  // Archives can specify an alternative schema.
  imdiSchema: string;
};

let otherConfigurationSettings: OtherConfigurationSettings = {
  configurationFullName: "",
  archiveUsesImdi: false,
  archiveUsesParadisec: false,
  showRoCrate: false,
  fileNameRules: "ASCII",
  imdiSchema: "IMDI_3.0.xsd"
};

export function SetOtherConfigurationSettings(
  settings: OtherConfigurationSettings
) {
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
    imdiSchema: "IMDI_3.0.xsd"
  };
}
