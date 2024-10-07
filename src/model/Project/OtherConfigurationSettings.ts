export type OtherConfigurationSettings = {
  configurationFullName: string;
  showImdiPreview: boolean;
  showParadisec: boolean;
  showRoCrate: boolean;
  fileNameRules: "ASCII" | "unicode";
};

let otherConfigurationSettings: OtherConfigurationSettings = {
  configurationFullName: "",
  showImdiPreview: false,
  showParadisec: false,
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
    showImdiPreview: false,
    showParadisec: false,
    showRoCrate: false,
    configurationFullName: "",
    fileNameRules: "ASCII"
  };
}
