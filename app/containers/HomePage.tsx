import Home from "../components/Home";
import { Session } from "../model/Session";
import * as React from "react";
import * as mobx from "mobx";
import { observer } from "mobx-react";
import { Project } from "../model/Project";
import Persistence from "../model/Persistence";

@observer
export default class HomePage extends React.Component<any> {
  @mobx.observable public project = new Project();

  constructor() {
    super();
    this.project = Persistence.loadProjectFolder("sample data/Edolo sample");
  }

  public render() {
    return (
      <Home
        sessions={this.project.sessions}
        selectedSession={this.project.selectedSession}
      />
    );
  }
}
