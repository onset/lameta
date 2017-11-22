import * as fs from "fs";
import * as path from "path";
import * as mobx from "mobx";
import { ISession } from "./SessionModel";

class SelectedItem {
  @mobx.observable public index: number;
}

export class ProjectModel {
  @mobx.observable public selectedSession: SelectedItem;
  @mobx.observable public sessions: ISession[] = [];

  constructor() {
    this.selectedSession = new SelectedItem();
  }

  public loadSession(sessionPath: string) {
    const s: string = fs.readFileSync(sessionPath, "utf8");
    const x: ISession = ISession.fromObject(JSON.parse(s));
    x.selectedFile = x.files[0];
    x.path = fs.realpathSync(sessionPath);
    x.directory = path.dirname(x.path);
    console.log(x.path + " vs " + x.directory);
    console.log("loaded " + x.getString("title"));
    this.sessions.push(x);

    mobx.autorunAsync(
      () => this.saveSession(x),
      10 * 1000 /* min 10 seconds in between */
    );
  }

  public saveSession(session: ISession) {
    console.log("saving " + session.getString("title"));
    fs.writeFileSync(session.path + ".test", JSON.stringify(session), "utf8");
  }
}
