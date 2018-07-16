import * as React from "react";
import { observer } from "mobx-react";
import { AuthorityLists } from "../../model/Project/AuthorityLists/AuthorityLists";
import { Project } from "../../model/Project/Project";
import {
  ComponentTab,
  FolderListButtons,
  FileListButtons
} from "../componentTab/ComponentTab";
import "./SessionsTab.scss";

interface IProps {
  project: Project;
  authorityLists: AuthorityLists;
}

@observer
export class SessionsTab extends React.Component<IProps> {
  public render() {
    const folderListButtons = new Array<JSX.Element>();
    folderListButtons.push(
      <button key="newSession" onClick={e => this.props.project.addSession()}>
        New Session
      </button>
    );
    return (
      <ComponentTab
        project={this.props.project}
        folders={this.props.project.sessions}
        selectedFolder={this.props.project.selectedSession}
        folderTypeStyleClass="sessions"
        columns={["id", "title", "date"]}
        columnWidths={[60, 150, 90]}
        authorityLists={this.props.authorityLists}
        folderListButtons={folderListButtons}
      >
        {/* This way would be better but is somewhat more involved, to tease out multiple children destinations
          see https://github.com/facebook/react/issues/9834...
          <FolderListButtons>
          <button onClick={e => this.props.project.addSession()}>
            New Session
          </button>
        </FolderListButtons> */}
      </ComponentTab>
    );
  }
}
