import { app } from "electron";
import call from "electron-call";
import Store from "electron-store";

const store = new Store({ name: "lameta-user-settings" });
export class MainProcessApi {
  async getAppName() {
    return app.getName();
  }
  async getUserSetting<T>(name: string, defaultValue: T): Promise<T> {
    return store.get(name, defaultValue) as T;
  }
  setUserSetting<T>(name: string, value: T) {
    store.set(name, value);
  }
}

const mainProcessInstance = new MainProcessApi();
call.provide("MainProcessApi", mainProcessInstance);
