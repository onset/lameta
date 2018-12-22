import React from "react";
import Store from "electron-store";
import * as mobx from "mobx";

export class UserSettings {
  private store: Store;

  @mobx.observable
  public showIMDIPanels;

  constructor() {
    this.store = new Store({ name: "saymore-user-settings" });
    this.showIMDIPanels = this.store.get("showIMDIPanels") || false;
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

  private howUsing: string;
  @mobx.computed
  public get HowUsing() {
    this.howUsing = this.store.get("howUsing", "");
    return this.howUsing;
  }
  public set HowUsing(v: string) {
    this.howUsing = v;
    this.store.set("howUsing", v);
  }
}

const userSettingsSingleton: UserSettings = new UserSettings();
export default userSettingsSingleton;

//nb: the parameter here is just to make the type system work. Weird.
export const SettingsContext = React.createContext(new UserSettings());
