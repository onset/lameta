import * as React from "react";
import { Trans } from "@lingui/macro";
import { observer } from "mobx-react";
import { AuthorityLists } from "../../model/Project/AuthorityLists/AuthorityLists";
import { Project } from "../../model/Project/Project";
import "./SessionsTab.scss";
import ComponentTab from "../componentTab/ComponentTab";

interface IProps {
  project: Project;
  authorityLists: AuthorityLists;
}

export const SessionsTab = observer(
  class SessionsTab extends React.Component<IProps> {
    public render() {
      const folderListButtons = new Array<JSX.Element>();
      folderListButtons.push(
        <button
          id="newSession"
          data-testid="new-session-button"
          key="newSession"
          onClick={(e) => {
            this.props.project.addSession();
            // If there's an active filter, try to re-run it so the new session will be included if it matches.
            // We purposely do NOT clear searchQuery so persistence across tab switches works.
            const q = this.props.project.sessions.searchQuery;
            if (q && q.trim().length > 0) {
              this.props.project.sessions.filter(q);
            }
          }}
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
);
