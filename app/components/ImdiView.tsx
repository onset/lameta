import * as React from "react";
import { Folder } from "../model/Folder";
import ImdiGenerator from "../export/imdiGenerator";
import { Session } from "../model/Project/Session/Session";
import { Project } from "../model/Project/Project";
//const HtmlTree = require("react-htmltree");

export interface IProps {
  // including the function prevented the react hot loader from giving us new xml
  // when the code changed
  //contentGenerator: (folder: Folder) => string;
  folder: Folder;
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
    const xml =
      this.props.folder instanceof Session
        ? ImdiGenerator.generateSession(this.props.folder as Session)
        : ImdiGenerator.generateCorpus(this.props.folder as Project);

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
