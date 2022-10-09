import { app } from "electron";
import call from "electron-call";

export class MainProcessApi {
  async getAppName() {
    return app.getName();
  }
}

const mainProcessInstance = new MainProcessApi();
call.provide("MainProcessApi", mainProcessInstance);
