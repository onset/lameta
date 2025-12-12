import Store from "electron-store";
import { setUserInfoForErrorReporting } from "./errorHandling";
import uuid from "uuid";
import { observable, computed, makeObservable } from "mobx";
import React from "react";
import pkg from "package.json";
import { getTestEnvironment } from "../getTestEnvironment";
import { app, process } from "@electron/remote";
import Path from "path";
import fs from "fs-extra";

class FakeStore {
  private values = {};
  public get(s: string, def: any = ""): any {
    return this.values[s] || def;
  }

  public set(key: string, value: any): void {
    this.values[key] = value;
  }
  public path: string = "fake path";
}
const kFontZoomStepSize = 0.2;

export class UserSettings {
  private store: Store | FakeStore;

  private showIMDI: boolean; // don't confuse this with the IMDI-related behavior that comes with ELAR. This should only be used for viewing, not behavior.
  private paradisecMode: boolean;
  private showLanguageTags: boolean; // Show language tags on multilingual fields
  private howUsing: string;
  public uiFontZoom: number;
  private sendErrors: boolean;
  private ignoreFileNamingRules: boolean; // for testing only
  private disableSavingProjectData: boolean; // DEBUG: flag to prevent saving project data during testing

  private clientId: string;

  constructor() {
    makeObservable<
      UserSettings,
      | "showIMDI"
      | "paradisecMode"
      | "showLanguageTags"
      | "howUsing"
      | "sendErrors"
      | "ignoreFileNamingRules"
      | "disableSavingProjectData"
    >(this, {
      showIMDI: observable,
      paradisecMode: observable,
      showLanguageTags: observable,
      howUsing: observable,
      uiFontZoom: observable,
      sendErrors: observable,
      ignoreFileNamingRules: observable,
      disableSavingProjectData: observable,
      HowUsing: computed
    });

    // NB: something really strange happened here; if we access process here directly, it doesn't get the name.
    //     const E2E_USER_SETTINGS_STORE_NAME = process["env"]["E2E_USER_SETTINGS_STORE_NAME"];
    // Also, if we copy getTestEnvironment() into this file, it doesn't work.
    // Only works if we call from the other file. As if that file is in a different module with different acces to process.env.
    // We know that vite is vicious about breaking process.env, so it has to be something to do with that.
    const E2E_USER_SETTINGS_STORE_NAME =
      getTestEnvironment().E2E_USER_SETTINGS_STORE_NAME;

    let name = "lameta-user-settings";
    if (E2E_USER_SETTINGS_STORE_NAME?.length > 0) {
      name = E2E_USER_SETTINGS_STORE_NAME;
    } else {
      if (app.getPath) {
        // false in unit tests
        // at some point during 2.3 beta, we broke the file name here,
        // leaving it named ".json"
        // So here we fix it up if we find that.
        const brokenPath = Path.join(app.getPath("userData"), ".json");
        if (fs.existsSync(brokenPath)) {
          const correctPath = Path.join(
            app.getPath("userData"),
            name + ".json"
          );
          try {
            if (!fs.existsSync(correctPath)) {
              fs.renameSync(brokenPath, correctPath);
            } else {
              fs.rmSync(brokenPath); // we have two files, bad and good names. Remove incorrectly named one (note, it could be the more recent, ah well)
            }
          } catch (e) {
            // ah well
          }
        }
      }
    }
    this.store =
      process.env == undefined || // unit tests
      process.env.NODE_ENV === "test" ||
      E2E_USER_SETTINGS_STORE_NAME === "none" // like we're running for the first time
        ? new FakeStore()
        : new Store({
            name: name
          });
    this.sendErrors = process.env?.NODE_ENV === "production"; // developer has a menu that can toggle this

    // the "imdiMode" here is legacy, so we don't want to break it by changing to "showIMDI"
    this.showIMDI = this.store.get("imdiMode", false);
    this.paradisecMode = this.store.get("paradisecMode") || false;
    this.showLanguageTags = this.store.get("showLanguageTags") || false;
    this.howUsing = this.store.get("howUsing", "");
    // lastVersion was new in 0.83 (first "Digame" release after name change from saymorex,
    // before changing to "lameta" for version 0.84)
    this.store.set("lastVersion", pkg.version);
    // no: sentry is not initialized yet, so let it call this itself when it is initialized
    //      setUserInfoForErrorReporting(this.Email, this.HowUsing);
    this.uiFontZoom = this.store.get("uiFontZoom", "1.0");
    this.disableSavingProjectData = this.store.get(
      "disableSavingProjectData",
      false
    );
  }

  public get SendErrors() {
    return this.sendErrors;
  }
  public set SendErrors(doSend: boolean) {
    this.sendErrors = doSend;
  }

  public get ShowIMDI() {
    return this.showIMDI; // use the observable property instead of store.get()
  }
  public set ShowIMDI(show: boolean) {
    this.showIMDI = show;
    this.store.set("imdiMode", this.showIMDI);
  }
  public get ParadisecMode() {
    return this.paradisecMode;
  }
  public set ParadisecMode(show: boolean) {
    this.paradisecMode = show;
    this.store.set("paradisecMode", this.ParadisecMode);
  }
  public get ShowLanguageTags() {
    return this.showLanguageTags;
  }
  public set ShowLanguageTags(show: boolean) {
    this.showLanguageTags = show;
    this.store.set("showLanguageTags", this.showLanguageTags);
  }
  // clientId  identifies the machine (or account, I suppose), not the actual person
  // i.e., if this same person uses a different machine, we won't know it's the same person
  public get ClientId() {
    if (!this.clientId || this.clientId.length === 0) {
      this.clientId = this.store.get("clientId", uuid());
      this.store.set("clientId", this.clientId);
    }
    return this.clientId;
  }

  public get ExportFormat(): string {
    return this.store.get("exportFormat", "csv");
  }
  public set ExportFormat(format: string) {
    this.store.set("exportFormat", format);
  }

  public get SendErrorsAndAnalytics(): boolean {
    return this.howUsing !== "developer";
  }
  public get PreviousProjectDirectory(): string | null {
    return this.store.get("previousDirectory", null);
  }
  public set PreviousProjectDirectory(dir: string | null) {
    this.store.set("previousDirectory", dir);
  }
  public get UILanguage() {
    return this.store.get("uiLanguage", "");
  }
  public set UILanguage(code: string) {
    this.store.set("uiLanguage", code);
  }
  public get DeveloperMode() {
    return this.howUsing === "developer";
  }
  public get IgnoreFileNamingRules() {
    return this.ignoreFileNamingRules;
  }
  public set IgnoreFileNamingRules(ignore: boolean) {
    this.ignoreFileNamingRules = ignore;
  }
  // DEBUG: Flag to prevent saving project data during testing/debugging
  public get DisableSavingProjectData() {
    return this.disableSavingProjectData;
  }
  public set DisableSavingProjectData(disable: boolean) {
    this.disableSavingProjectData = disable;
    this.store.set("disableSavingProjectData", disable);
  }
  public get Email() {
    return this.store.get("email", "");
  }
  public set Email(v: string) {
    this.store.set("email", v);
    setUserInfoForErrorReporting(this.Email, this.HowUsing);
  }

  public get HowUsing() {
    return this.howUsing;
  }
  public set HowUsing(howUsing: string) {
    this.howUsing = howUsing;
    this.store.set("howUsing", howUsing);
    setUserInfoForErrorReporting(this.Email, this.HowUsing);
  }

  public get FontZoom() {
    return this.uiFontZoom;
  }
  public ZoomFont(direction: number) {
    let n = parseFloat(this.store.get("uiFontZoom", "1.0"));
    const kIncrement = 0.5;
    n += kFontZoomStepSize * direction * kIncrement;
    n = Math.min(n, 3.0);
    n = Math.max(1.0, n);
    this.uiFontZoom = n;
    this.store.set("uiFontZoom", this.uiFontZoom.toString());
  }

  public GetMediaFolder(projectId: string): string | undefined {
    const projectToFolder = this.store.get("mediaFolders") || {};
    // console.log(
    //   `GetMediaFolder(${projectId}) = ${JSON.stringify(projectToFolder)}`
    // );
    return projectToFolder[projectId];
  }
  public SetMediaFolder(projectId: string, path: string | undefined) {
    if (projectId) {
      const projectToFolder = this.store.get("mediaFolders") || {};
      projectToFolder[projectId] = path;
      this.store.set("mediaFolders", projectToFolder);
    }
  }
  public Get(name: string, defaultValue: string) {
    return this.store.get(name, defaultValue);
  }
  public Set(name: string, value: string) {
    this.store.set(name, value);
  }
}

const userSettingsSingleton: UserSettings = new UserSettings();
export default userSettingsSingleton;

export function useUserSetting(name: string, defaultValue: string) {
  const v = userSettingsSingleton.Get(name, defaultValue);
  const [x, setX] = React.useState(v);
  return [
    x,
    (value: string) => {
      userSettingsSingleton.Set(name, value);
      setX(value);
    }
  ];
}
export function getMediaFolderOrEmptyForProjectAndMachine(projectId: string) {
  // console.log(
  //   `media folder for ${projectId} is ${
  //     userSettingsSingleton.GetMediaFolder(projectId) || ""
  //   }`
  // );
  return userSettingsSingleton.GetMediaFolder(projectId) || "";
}
export function setMediaFolderOrEmptyForProjectAndMachine(
  projectId: string,
  path: string
) {
  userSettingsSingleton.SetMediaFolder(projectId, path);
}
