import Home from "../components/Home";
import { Session } from "../model/SessionModel";
import * as React from "react";
import * as mobx from "mobx";
import { observer } from "mobx-react";
import { ProjectModel } from "../model/ProjectModel";

@observer
export default class HomePage extends React.Component<any> {
  @mobx.observable public store = new ProjectModel();

  constructor() {
    super();
    this.store.loadSession(
      "test/sample/Sessions/Community Members/Community Members.session"
    );
    this.store.loadSession("test/sample/Sessions/Flowers/Flowers.session");
    this.store.selectedSession.index = 0;
  }

  public render() {
    return (
      <Home
        sessions={this.store.sessions}
        selectedSession={this.store.selectedSession}
      />
    );
  }
}
