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
export class PeopleTab extends React.Component<IProps> {
  public render() {
    return (
      <ComponentTab
        folders={this.props.project.persons}
        selectedFolder={this.props.project.selectedPerson}
        folderTypeStyleClass="people"
        columns={["name"]}
        authorityLists={this.props.authorityLists}
      >
        <button>New Person</button>
      </ComponentTab>
    );
  }
}
