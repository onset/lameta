import * as React from "react";
import { FolderGroup } from "../../model/Folder/Folder";
import { FolderPane } from "../FolderPane";
import { observer } from "mobx-react";
import { AuthorityLists } from "../../model/Project/AuthorityLists/AuthorityLists";
import { Project } from "../../model/Project/Project";
import "./ComponentTab.scss";

import SplitPane from "react-split-pane";
import FolderList from "../FolderList";
import { SearchContext } from "../SearchContext";
import { css } from "@emotion/react";
import { highlightReact } from "../highlighting";

interface IProps {
  nameForPersistingUsersTableConfiguration: string;
  folders: FolderGroup;
  folderTypeStyleClass: string;
  columns: string[];
  columnWidths: number[];
  authorityLists: AuthorityLists;
  project: Project;
  folderListButtons?: JSX.Element[];
  fileListButtons?: object[];
}

// This is the "Sessions" tab and the "People" tab.  It is a tab that has a list of folders on
// the left and a pane showing the files of that folder on the right.
const ComponentTab: React.FunctionComponent<IProps> = (props) => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const splitterKey = props.folderTypeStyleClass + "VerticalSplitPosition";
  const splitterposition = localStorage.getItem(splitterKey) || "300";
  const sp = parseInt(splitterposition, 10);
  if (props.folders.selectedIndex >= props.folders.items.length)
    throw Error(
      `folders.length = ${props.folders.items.length} but selected index is ${props.folders.selectedIndex}`
    );

  return (
    <SearchContext.Provider value={{ query: searchQuery }}>
      <div className={"componentTab " + props.folderTypeStyleClass}>
        <SplitPane
          split="vertical"
          defaultSize={sp}
          onChange={(size: any) => localStorage.setItem(splitterKey, size)}
        >
          <div className={"firstColumn"}>
            <FolderList
              nameForPersistingUsersTableConfiguration={
                props.nameForPersistingUsersTableConfiguration
              }
              folders={props.folders}
              columns={props.columns}
              columnWidths={props.columnWidths}
              onSearchQueryChange={(q) => setSearchQuery(q)}
            />
            <div className={"newFolderBar"}>{props.folderListButtons}</div>
          </div>
          {props.folders &&
          props.folders.items.length > 0 &&
          props.folders.selectedIndex > -1 ? (
            <FolderPane
              project={props.project}
              // Note, when props.folders.selectedIndex, mobx should cause us to re-render because selectedIndex is an observable,
              // and we are an observer.
              folder={props.folders.items[props.folders.selectedIndex]}
              folderTypeStyleClass={props.folderTypeStyleClass}
              showStandardMetaTabs={true}
              authorityLists={props.authorityLists}
              fileListButtons={props.fileListButtons}
            >
              <h3 className={"paneTitle"}>
                {highlightReact(
                  props.folders.items[props.folders.selectedIndex].displayName,
                  searchQuery,
                  { background: "#ffe58f" }
                )}
              </h3>
            </FolderPane>
          ) : (
            <React.Fragment />
          )}
        </SplitPane>
      </div>
    </SearchContext.Provider>
  );
};

// highlight helper removed in favor of shared highlightReact

// tslint:disable-next-line:no-empty-interface
interface IJustChildrenProps {}
export const FileListButtons: React.FunctionComponent<IJustChildrenProps> = (
  props
) => {
  return <React.Fragment>{props.children}</React.Fragment>;
};
export const FolderListButtons: React.FunctionComponent<IJustChildrenProps> = (
  props
) => {
  return <React.Fragment>{props.children}</React.Fragment>;
};
// we need to re-render when the selected folder or selected file in the folder changes
export default observer(ComponentTab);
