import Home from "../components/Home";
import * as React from "react";
import * as mobx from "mobx";
import { observer } from "mobx-react";
import { Project } from "../model/Project/Project";
import * as fs from "fs";

// tslint:disable-next-line:no-empty-interface
interface IProps {}

@observer
export default class HomePage extends React.Component<IProps> {
  @mobx.observable public project: Project;

  constructor(props: IProps) {
    super(props);
    this.project = Project.fromDirectory(
      fs.realpathSync("sample data/Edolo sample")
    );
  }

  public render() {
    return (
      <Home
        project={this.project}
        authorityLists={this.project.authorityLists}
      />
    );
  }
}
