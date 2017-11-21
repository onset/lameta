import Home from "../components/Home";
import { ISession } from "../components/SessionModel";
import * as React from "react";
import * as mobx from "mobx";
import { observer } from "mobx-react";
import * as fs from "fs";
import * as path from "path";

class SelectedItem {
  @mobx.observable index: number;
}

class Store {

  @mobx.observable selectedSession: SelectedItem;
  @mobx.observable sessions: ISession[] = [];

  constructor() {
    this.selectedSession = new SelectedItem();
  }

  loadSession(sessionPath: string) {
    let s: string = fs.readFileSync(sessionPath, "utf8");
    let x: ISession = ISession.fromObject(JSON.parse(s));
    x.selectedFile = x.files[0];
    x.path = fs.realpathSync(sessionPath);
    x.directory = path.dirname( x.path );
    console.log(x.path+ " vs "+x.directory);
    console.log("loaded " + x.getString("title"));
    this.sessions.push(x);

    mobx.autorunAsync(() => this.saveSession(x), 10*1000 /* min 10 seconds in between */);
  }

  saveSession(session: ISession) {
    console.log("saving " + session.getString("title"));
    fs.writeFileSync(session.path + ".test", JSON.stringify(session), "utf8");
  }
}

@observer
export default class HomePage extends React.Component<any> {
  @mobx.observable store = new Store();

  constructor() {
    super();
    this.store.loadSession("test/sample/Sessions/Community Members/Community Members.session");
    this.store.loadSession("test/sample/Sessions/Flowers/Flowers.session");
    this.store.selectedSession.index = 0;
  }

  render() {
    return (
      <Home sessions={this.store.sessions} selectedSession={this.store.selectedSession} />
    );
  }
}
