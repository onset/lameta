import * as React from "react";
import { SessionList } from "./SessionList";
import { Folder, IFolderSelection } from "../model/Folder";
import { FolderPane } from "./FolderPane";
import { observer } from "mobx-react";
const styles = require("./Sessions.scss");

interface IProps {
  folders: Folder[];
  selectedFolder: IFolderSelection;
}

@observer
export class SessionsTab extends React.Component<IProps> {
  public render() {
    return (
      <div className={styles.sessionsTab}>
        <SessionList
          folders={this.props.folders}
          selectedFolder={this.props.selectedFolder}
        />
        <FolderPane
          folder={this.props.folders[this.props.selectedFolder.index]}
        />
      </div>
    );
  }
}
