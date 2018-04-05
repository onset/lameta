import * as React from "react";
import { Folder } from "../model/Folder";
import ImdiGenerator from "../export/imdiGenerator";
import { Session } from "../model/Project/Session/Session";
import { Project } from "../model/Project/Project";
import { Person } from "../model/Project/Person/Person";
import "./ImdiView.scss";

//const HtmlTree = require("react-htmltree");

export interface IProps {
  // including the function prevented the react hot loader from giving us new xml
  // when the code changed
  //contentGenerator: (folder: Folder) => string;
  folder: Folder;

  // note, folder will equal project if we're generating at the project level
  // otherwise, folder will be a session or person
  project: Project;
}
interface IState {
  manualRefresh: number;
}
export default class ImdiView extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = { manualRefresh: 0 };
  }

  public render() {
    let xml = "";
    if (this.props.folder instanceof Session) {
      xml = ImdiGenerator.generateSession(
        this.props.folder as Session,
        this.props.project
      );
    } else if (this.props.folder instanceof Project) {
      xml = ImdiGenerator.generateCorpus(this.props.folder as Project);
    } else {
      xml = ImdiGenerator.generateActor(
        this.props.folder as Person,
        this.props.project
      );
    }

    return (
      <div className={"imdiView"}>
        <div className={"imdiButtonRow"}>
          {/* <input
            type="button"
            value="Refresh"
            onClick={() => {
              this.setState({ manualRefresh: this.state.manualRefresh + 1 });
            }}
          /> */}
        </div>
        <textarea
          readOnly
          className={"imdiView"}
          value={xml}
          // this.props.contentGenerator(this.props.folder) +
          // this.state.manualRefresh
        />
      </div>
    );
  }
}
