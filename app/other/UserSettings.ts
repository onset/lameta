import Store from "electron-store";
import { setUserInfoForErrorReporting } from "./errorHandling";
import uuid from "uuid";
import { observable, computed } from "mobx";
import React from "react";

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

  @observable
  private imdiMode: boolean;
  @observable
  private paradisecMode: boolean;
  @observable
  private howUsing: string;
  @observable
  public uiFontZoom: number;
  @observable
  private sendErrors: boolean;

  private clientId: string;

  constructor() {
    this.store =
      process.env.NODE_ENV === "test"
        ? new FakeStore()
        : new Store({ name: "lameta-user-settings" });
    this.sendErrors = process.env.NODE_ENV === "production"; // developer has a menu that can toggle this

    this.imdiMode = this.storeGet("imdiMode", false);
    this.paradisecMode = this.storeGet("paradisecMode", false);
    this.howUsing = this.storeGet("howUsing", "");
    // lastVersion was new in 0.83 (first "Digame" release after name change from saymorex,
    // before changing to "lameta" for version 0.84)
    this.storeSet("lastVersion", require("../package.json").version);
    // no: sentry is not initialized yet, so let it call this itself when it is initialized
    //      setUserInfoForErrorReporting(this.Email, this.HowUsing);
    this.uiFontZoom = this.storeGet("uiFontZoom", 1.0);
  }

  private storeGet<T>(name: string, defaultValue: T): T {
    return this.store.get(name) ?? defaultValue;
  }

  private storeSet<T>(name: string, value: T) {}

  public get SendErrors() {
    return this.sendErrors;
  }
  public set SendErrors(doSend: boolean) {
    this.sendErrors = doSend;
  }

  public get IMDIMode() {
    return this.storeGet("imdiMode", false);
  }
  public set IMDIMode(show: boolean) {
    this.imdiMode = show;
    this.storeSet("imdiMode", this.imdiMode);
  }
  public get ParadisecMode() {
    return this.paradisecMode;
  }
  public set ParadisecMode(show: boolean) {
    this.paradisecMode = show;
    this.storeSet("paradisecMode", this.ParadisecMode);
  }
  // clientId  identifies the machine (or account, I suppose), not the actual person
  // i.e., if this same person uses a different machine, we won't know it's the same person
  public get ClientId() {
    if (!this.clientId || this.clientId.length === 0) {
      this.clientId = this.storeGet("clientId", uuid());
    }
    return this.clientId;
  }

  public get ExportFormat(): string {
    return this.storeGet("exportFormat", "csv");
  }
  public set ExportFormat(format: string) {
    this.storeSet("exportFormat", format);
  }

  public get SendErrorsAndAnalytics(): boolean {
    return this.howUsing !== "developer";
  }
  public get PreviousProjectDirectory(): string | null {
    return this.storeGet("previousDirectory", null);
  }
  public set PreviousProjectDirectory(dir: string | null) {
    this.storeSet("previousDirectory", dir);
  }
  public get UILanguage() {
    return this.storeGet("uiLanguage", "");
  }
  public set UILanguage(code: string) {
    this.storeSet("uiLanguage", code);
  }
  public get DeveloperMode() {
    return this.howUsing === "developer";
  }
  public get Email() {
    return this.storeGet("email", "");
  }
  public set Email(v: string) {
    this.storeSet("email", v);
    setUserInfoForErrorReporting(this.Email, this.HowUsing);
  }

  @computed
  public get HowUsing() {
    return this.howUsing;
  }
  public set HowUsing(howUsing: string) {
    this.howUsing = howUsing;
    this.storeSet("howUsing", howUsing);
    setUserInfoForErrorReporting(this.Email, this.HowUsing);
  }

  public get FontZoom() {
    return this.uiFontZoom;
  }
  public ZoomFont(direction: number) {
    let n = parseFloat(this.storeGet("uiFontZoom", "1.0"));
    const kIncrement = 0.5;
    n += kFontZoomStepSize * direction * kIncrement;
    n = Math.min(n, 3.0);
    n = Math.max(1.0, n);
    this.uiFontZoom = n;
    this.storeSet("uiFontZoom", this.uiFontZoom.toString());
  }

  public GetMediaFolder(projectId: string): string | undefined {
    const projectToFolder = this.storeGet("mediaFolders", {});
    // console.log(
    //   `GetMediaFolder(${projectId}) = ${JSON.stringify(projectToFolder)}`
    // );
    return projectToFolder[projectId];
  }
  public SetMediaFolder(projectId: string, path: string | undefined) {
    if (projectId) {
      const projectToFolder = this.storeGet("mediaFolders", {});
      projectToFolder[projectId] = path;
      this.storeSet("mediaFolders", projectToFolder);
    }
  }
  public Get(name: string, defaultValue: string) {
    return this.storeGet(name, defaultValue);
  }
  public Set(name: string, value: string) {
    this.storeSet(name, value);
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
    },
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
