import * as React from "react";
import { FolderList } from "./FolderList";
import { Folder, IFolderSelection } from "../model/Folder";
import { FolderPane } from "./FolderPane";
import { observer } from "mobx-react";

interface IProps {
  folders: Folder[];
  selectedFolder: IFolderSelection;
  folderTypeStyleClass: string;
  columns: string[];
}

// Sorry, the name for this is bad... suggestions welcome.
// This implements the screens for both Sessions and People, but not Projects.
// So they are "components" of the project.
@observer
export class ComponentTab extends React.Component<IProps> {
  public render() {
    return (
      <div className={"componentTab " + this.props.folderTypeStyleClass}>
        <FolderList
          folders={this.props.folders}
          selectedFolder={this.props.selectedFolder}
          columns={this.props.columns}
        />
        {this.props.folders &&
          this.props.folders.length > 0 && (
            <FolderPane
              folder={this.props.folders[this.props.selectedFolder.index]}
              folderTypeStyleClass={this.props.folderTypeStyleClass}
            />
          )}
      </div>
    );
  }
}
