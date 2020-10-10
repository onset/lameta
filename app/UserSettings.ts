import Store from "electron-store";
import { setUserInfoForErrorReporting } from "./errorHandling";
import uuid from "uuid";
import { observable, computed } from "mobx";

class FakeStore {
  public get(s: string, def: any = ""): any {
    return def;
  }
  public set(key: string, value: any): void {}
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

  private email: string;
  private clientId: string;

  constructor() {
    this.store =
      process.env.NODE_ENV === "test"
        ? new FakeStore()
        : new Store({ name: "lameta-user-settings" });
    this.sendErrors = process.env.NODE_ENV === "production"; // developer has a menu that can toggle this

    this.imdiMode = this.store.get("imdiMode") || false;
    this.paradisecMode = this.store.get("paradisecMode") || false;
    this.howUsing = this.store.get("howUsing", "");
    this.email = this.store.get("email", "");
    // lastVersion was new in 0.83 (first "Digame" release after name change from saymorex,
    // before changing to "lameta" for version 0.84)
    this.store.set("lastVersion", require("./package.json").version);
    // no: sentry is not initialized yet, so let it call this itself when it is initialized
    //      setUserInfoForErrorReporting(this.Email, this.HowUsing);
    this.uiFontZoom = this.store.get("uiFontZoom", "1.0");
  }

  public get SendErrors() {
    return this.sendErrors;
  }
  public set SendErrors(doSend: boolean) {
    this.sendErrors = doSend;
  }

  public get IMDIMode() {
    return this.imdiMode;
  }
  public set IMDIMode(show: boolean) {
    this.imdiMode = show;
    this.store.set("imdiMode", this.imdiMode);
  }
  public get ParadisecMode() {
    return this.paradisecMode;
  }
  public set ParadisecMode(show: boolean) {
    this.paradisecMode = show;
    this.store.set("paradisecMode", this.ParadisecMode);
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

  @computed
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
}

const userSettingsSingleton: UserSettings = new UserSettings();
export default userSettingsSingleton;
