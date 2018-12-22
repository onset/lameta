import React from "react";
import Store from "electron-store";
import * as mobx from "mobx";
import { setUserInfoForErrorReporting } from "./errorHandling";
import uuid from "uuid";

export class UserSettings {
  private store: Store;

  @mobx.observable
  private showIMDIPanels: boolean;
  @mobx.observable
  private howUsing: string;
  private email: string;
  private clientId: string;

  constructor() {
    this.store = new Store({ name: "saymore-user-settings" });
    this.showIMDIPanels = this.store.get("showIMDIPanels") || false;
    this.howUsing = this.store.get("howUsing", "");
    this.email = this.store.get("email", "");
    setUserInfoForErrorReporting(this.Email, this.HowUsing);
  }
  public get ShowIMDIPanels() {
    return this.showIMDIPanels;
  }

  public set ShowIMDIPanels(show: boolean) {
    this.showIMDIPanels = show;
    this.store.set("showIMDIPanels", this.showIMDIPanels);
  }

  // clientId  identifies the machine (or account, I suppose), not the actual person
  // i.e., if this same person uses a different machine, we won't know it's the same person
  public get ClientId() {
    if (!this.clientId || this.clientId.length === 0) {
      this.clientId = this.store.get("clientId", uuid());
    }
    return this.clientId;
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
  public get Email() {
    return this.email;
  }
  public set Email(v: string) {
    this.store.set("email", v);
    setUserInfoForErrorReporting(this.Email, this.HowUsing);
  }

  @mobx.computed
  public get HowUsing() {
    return this.howUsing;
  }
  public set HowUsing(howUsing: string) {
    this.howUsing = howUsing;
    this.store.set("howUsing", howUsing);
    setUserInfoForErrorReporting(this.Email, this.HowUsing);
  }

  // private get(key: string, defaultIfMissing: string) {
  //   return this.store.get(key, defaultIfMissing);
  // }
  // private setString(key: string, value: string): void {
  //   this.store.set(key, value);
  // }
}

const userSettingsSingleton: UserSettings = new UserSettings();
export default userSettingsSingleton;

//nb: the parameter here is just to make the type system work. Weird.
export const SettingsContext = React.createContext(new UserSettings());
