import * as React from "react";
import { Trans } from "@lingui/macro";
import { observer } from "mobx-react";
import { AuthorityLists } from "../../model/Project/AuthorityLists/AuthorityLists";
import { Project } from "../../model/Project/Project";
import { ComponentTab } from "../componentTab/ComponentTab";
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
      <button
        id="newSession"
        key="newSession"
        onClick={(e) => this.props.project.addSession()}
      >
        <Trans>New Session</Trans>
      </button>
    );
    // console.log(
    //   `SessionTab render length:${this.props.project.sessions.items.length} selected:${this.props.project.sessions.selected.index}`
    // );
    return (
      <ComponentTab
        nameForPersistingUsersTableConfiguration="sessions"
        project={this.props.project}
        folders={this.props.project.sessions}
        folderTypeStyleClass="sessions"
        columns={["checked", "id", "title", "status", "date"]}
        columnWidths={[10 /*checkbox*/, 60, 150, 60, 90]}
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
