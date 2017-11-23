import * as fs from "fs";
import * as path from "path";
import * as mobx from "mobx";
import * as glob from "glob";

import { Session } from "./Session";

export class SelectedItem {
  @mobx.observable public index: number;
}

export class Project {
  @mobx.observable public selectedSession: SelectedItem;
  @mobx.observable public sessions: Session[] = [];

  constructor() {
    this.selectedSession = new SelectedItem();
  }
}
