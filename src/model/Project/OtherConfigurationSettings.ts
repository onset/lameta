export type OtherConfigurationSettings = {
  configurationFullName: string;
  archiveUsesImdi: boolean;
  archiveUsesParadisec: boolean;
  showRoCrate: boolean;
  fileNameRules: "ASCII" | "unicode";
};

let otherConfigurationSettings: OtherConfigurationSettings = {
  configurationFullName: "",
  archiveUsesImdi: false,
  archiveUsesParadisec: false,
  showRoCrate: false,
  fileNameRules: "ASCII"
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
    fileNameRules: "ASCII"
  };
}
