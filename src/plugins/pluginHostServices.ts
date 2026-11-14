// The lameta side of PluginHostServices: the Save dialog through the main process, the
// remembered save folders in user settings, and the open project's folder.

import { ipcRenderer } from "electron";
import { t } from "@lingui/core/macro";
import userSettings from "../other/UserSettings";
import { Project } from "../model/Project/Project";
import { PluginHostServices } from "./PluginHostBridge";

export const pluginHostServices: PluginHostServices = {
  showSaveDialog: ({ pluginName, defaultPath, filters }) =>
    ipcRenderer.invoke("showSaveDialog", {
      title: t`${pluginName}: Save`,
      defaultPath,
      filters,
    }),
  getSaveFolder: (pluginId, key) => userSettings.GetPluginSaveFolder(pluginId, key),
  setSaveFolder: (pluginId, key, folder) => userSettings.SetPluginSaveFolder(pluginId, key, folder),
  getProjectDirectory: () => Project.getCurrentProjectDirectory(),
};
