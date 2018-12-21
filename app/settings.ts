import Store from "electron-store";
import * as mobx from "mobx";

class UserSettings {
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
}
const userSettingsSingleton: UserSettings = new UserSettings();
export default userSettingsSingleton;
