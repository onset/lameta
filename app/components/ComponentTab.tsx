import * as React from "react";
import { FolderList } from "./FolderList";
import { Folder, IFolderSelection } from "../model/Folder";
import { FolderPane } from "./FolderPane";
import { observer } from "mobx-react";
import { AuthorityLists } from "../model/Project/AuthorityLists/AuthorityLists";
//import SplitPane from "react-split-pane";
const SplitPane = require("react-split-pane");

interface IProps {
  folders: Folder[];
  selectedFolder: IFolderSelection;
  folderTypeStyleClass: string;
  columns: string[];
  columnWidths: number[];
  authorityLists: AuthorityLists;
}

// Sorry, the name for this is bad... suggestions welcome.
// This implements the screens for both Sessions and People, but not Projects.
// So they are "components" of the project.
// Any children are put in the bar at the lower left.
@observer
export class ComponentTab extends React.Component<IProps> {
  public render() {
    const splitterKey =
      this.props.folderTypeStyleClass + "VerticalSplitPosition";
    const splitterposition = localStorage.getItem(splitterKey) || "300";
    const sp = parseInt(splitterposition, 10);

    return (
      <div className={"componentTab " + this.props.folderTypeStyleClass}>
        <SplitPane
          split="vertical"
          minSize={100}
          defaultSize={sp}
          onChange={(size: any) => localStorage.setItem(splitterKey, size)}
        >
          <div className={"firstColumn"}>
            <FolderList
              folders={this.props.folders}
              selectedFolder={this.props.selectedFolder}
              columns={this.props.columns}
              columnWidths={this.props.columnWidths}
            />
            <div className={"newFolderBar"}>{this.props.children}</div>
          </div>
          {this.props.folders &&
            this.props.folders.length > 0 && (
              <FolderPane
                folder={this.props.folders[this.props.selectedFolder.index]}
                folderTypeStyleClass={this.props.folderTypeStyleClass}
                showStandardMetaTabs={true}
                authorityLists={this.props.authorityLists}
              >
                <h3 className={"paneTitle"}>
                  {
                    this.props.folders[this.props.selectedFolder.index]
                      .displayName
                  }
                </h3>
              </FolderPane>
            )}
        </SplitPane>
      </div>
    );
  }
}
