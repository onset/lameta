import React from "react";
import Store from "electron-store";
import * as mobx from "mobx";
import { setUserInfoForErrorReporting } from "./errorHandling";

export class UserSettings {
  private store: Store;

  @mobx.observable
  public showIMDIPanels;

  constructor() {
    this.store = new Store({ name: "saymore-user-settings" });
    this.showIMDIPanels = this.store.get("showIMDIPanels") || false;
    setUserInfoForErrorReporting(this.Email, this.HowUsing);
  }
  public setShowIMDIPanels(show: boolean) {
    this.showIMDIPanels = show;
    this.store.set("showIMDIPanels", this.showIMDIPanels);
  }
  public get(key: string, defaultIfMissing: string) {
    return this.store.get(key, defaultIfMissing);
  }
  public setString(key: string, value: string): void {
    this.store.set(key, value);
  }
  public get Email() {
    return this.store.get("email", "");
  }
  public set Email(v: string) {
    this.store.set("email", v);
    setUserInfoForErrorReporting(this.Email, this.HowUsing);
  }
  private howUsing: string;
  @mobx.computed
  public get HowUsing() {
    this.howUsing = this.store.get("howUsing", "");
    return this.howUsing;
  }
  public set HowUsing(v: string) {
    this.howUsing = v;
    this.store.set("howUsing", v);
    setUserInfoForErrorReporting(this.Email, this.HowUsing);
  }
}

const userSettingsSingleton: UserSettings = new UserSettings();
export default userSettingsSingleton;

//nb: the parameter here is just to make the type system work. Weird.
export const SettingsContext = React.createContext(new UserSettings());
