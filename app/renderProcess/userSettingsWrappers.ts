import React, { useEffect } from "react";
import { userSettings } from "../MainProcessApiAccess";

export function useUserSetting(name: string, defaultValue: string) {
  const [value, setValue] = React.useState(defaultValue);
  useEffect(() => {
    userSettings.Get(name, defaultValue).then((r) => setValue(r));
  }, [name]);
  return [
    value,
    (value: string) => {
      userSettings.Set(name, value);
      setValue(value);
    },
  ];
}
export function getMediaFolderOrEmptyForProjectAndMachine(projectId: string) {
  // console.log(
  //   `media folder for ${projectId} is ${
  //     userSettingsSingleton.GetMediaFolder(projectId) || ""
  //   }`
  // );
  return userSettings.GetMediaFolder(projectId) || "";
}
export function setMediaFolderOrEmptyForProjectAndMachine(
  projectId: string,
  path: string
) {
  userSettings.SetMediaFolder(projectId, path);
}
