import * as React from "react";
import { FolderList } from "./FolderList";
import { Folder, IFolderSelection } from "../model/Folder";
import { FolderPane } from "./FolderPane";
import { observer } from "mobx-react";
import { AuthorityLists } from "../model/Project/AuthorityLists/AuthorityLists";
import { Project } from "../model/Project/Project";
import { ComponentTab } from "./ComponentTab";

interface IProps {
  project: Project;
  authorityLists: AuthorityLists;
}

@observer
export class SessionsTab extends React.Component<IProps> {
  public render() {
    return (
      <ComponentTab
        folders={this.props.project.sessions}
        selectedFolder={this.props.project.selectedSession}
        folderTypeStyleClass="sessions"
        columns={["title", "date"]}
        authorityLists={this.props.authorityLists}
      >
        <button onClick={e => this.props.project.addSession()}>
          New Session
        </button>
      </ComponentTab>
    );
  }
}
