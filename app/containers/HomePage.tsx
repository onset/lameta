import Home from "../components/Home";
import { ISession } from "../components/SessionModel";
import * as React from "react";
import * as mobx from "mobx";
import { observer } from "mobx-react";
import * as fs from "fs";

class SelectedItem {
  @mobx.observable index: number;
}

class Store {

  @mobx.observable selectedSession: SelectedItem;
  @mobx.observable sessions: ISession[] = [];

  constructor() {
    this.selectedSession = new SelectedItem();
  }

  load(path: string) {
    let s: string = fs.readFileSync(path, "utf8");
    let x: ISession = ISession.fromObject(JSON.parse(s));
    console.log("loaded " + x.getString("title"));
    this.sessions.push(x);
  }
}

@observer
export default class HomePage extends React.Component<any> {
  @mobx.observable store = new Store();

  constructor() {
    super();
    this.store.load("test/sample/Sessions/Community Members/Community Members.session");
    this.store.load("test/sample/Sessions/Flowers/Flowers.session");
  }

  render() {
    return (
      <Home sessions={this.store.sessions} selectedSession={this.store.selectedSession} />
    );
  }
}
