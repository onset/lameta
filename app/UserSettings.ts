import Store from "electron-store";
import * as mobx from "mobx";
import { setUserInfoForErrorReporting } from "./errorHandling";
import uuid from "uuid";
import * as Path from "path";
import * as fs from "fs-extra";
import * as Sentry from "@sentry/browser";

class FakeStore {
  public get(s: string, def: any = ""): any {
    return def;
  }
  public set(key: string, value: any): void {}
  public path: string = "fake path";
}
export class UserSettings {
  private store: Store | FakeStore;

  @mobx.observable
  private imdiMode: boolean;
  @mobx.observable
  private howUsing: string;
  private email: string;
  private clientId: string;
  public showNoticeAboutConversionFromSayMoreX: boolean;

  constructor() {
    this.store =
      process.env.NODE_ENV === "test"
        ? new FakeStore()
        : new Store({ name: "laMeta-user-settings" });

    this.imdiMode = this.store.get("imdiMode") || false;
    this.howUsing = this.store.get("howUsing", "");
    this.email = this.store.get("email", "");
    // lastVersion was new in 0.83 (first "Digame" release after name change from saymorex,
    // before changing to "lameta" for version 0.84)
    this.store.set("lastVersion", require("package.json").version);
    setUserInfoForErrorReporting(this.Email, this.HowUsing);
  }
  public get IMDIMode() {
    return this.imdiMode;
  }

  public set IMDIMode(show: boolean) {
    this.imdiMode = show;
    this.store.set("imdiMode", this.imdiMode);
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
}

const userSettingsSingleton: UserSettings = new UserSettings();
export default userSettingsSingleton;
