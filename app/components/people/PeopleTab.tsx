import * as React from "react";
import { observer } from "mobx-react";
import { AuthorityLists } from "../../model/Project/AuthorityLists/AuthorityLists";
import { Project } from "../../model/Project/Project";
import { File } from "../../model/file/File";
import {
  ComponentTab,
  FolderListButtons,
  FileListButtons,
} from "../componentTab/ComponentTab";
import "./PeopleTab.scss";
import { t, Trans } from "@lingui/macro";
import { i18n } from "../../other/localization";
interface IProps {
  project: Project;
  authorityLists: AuthorityLists;
}

@observer
export class PeopleTab extends React.Component<IProps> {
  public render() {
    const folderListButtons = new Array<JSX.Element>();
    folderListButtons.push(
      <button key="newPerson" onClick={(e) => this.props.project.addPerson()}>
        <Trans>New Person</Trans>
      </button>
    );
    const fileListButtons = [
      {
        label: t`Rename for Consent`,
        enabled: (selectedFile: File) => selectedFile.canRenameForConsent(),
        onClick: (f) => {
          (f as File).renameForConsent();
        },
      },
    ];

    return (
      <ComponentTab
        nameForPersistingUsersTableConfiguration="people"
        project={this.props.project}
        folders={this.props.project.persons}
        selectedFolder={this.props.project.persons.selected}
        folderTypeStyleClass="people"
        columns={["checked", "displayName", "hasConsent"]}
        columnWidths={[200, 100]}
        authorityLists={this.props.authorityLists}
        folderListButtons={folderListButtons}
        fileListButtons={fileListButtons}
      >
        {/* This way would be better but is somewhat more involved, to tease out multiple children destinations
          see https://github.com/facebook/react/issues/9834...
          <FolderListButtons>
          <button onClick={e => this.props.project.addPerson()}>
            New Person
          </button>
        </FolderListButtons>
        <FileListButtons>
          <button>Rename for Consent</button>
        </FileListButtons> */}
      </ComponentTab>
    );
  }
}
