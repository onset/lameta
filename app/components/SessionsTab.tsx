import * as React from "react";
import { FolderList } from "./FolderList";
import { Folder, IFolderSelection } from "../model/Folder";
import { FolderPane } from "./FolderPane";
import { observer } from "mobx-react";
import { AuthorityLists } from "../model/Project/AuthorityLists/AuthorityLists";
import { Project } from "../model/Project/Project";
import { ComponentTab } from "./ComponentTab";
import "./SessionsTab.scss";

interface IProps {
  project: Project;
  authorityLists: AuthorityLists;
}

@observer
export class SessionsTab extends React.Component<IProps> {
  public render() {
    return (
      <ComponentTab
        project={this.props.project}
        folders={this.props.project.sessions}
        selectedFolder={this.props.project.selectedSession}
        folderTypeStyleClass="sessions"
        columns={["id", "title", "date"]}
        columnWidths={[60, 150, 90]}
        authorityLists={this.props.authorityLists}
      >
        <button onClick={e => this.props.project.addSession()}>
          New Session
        </button>
      </ComponentTab>
    );
  }
}
