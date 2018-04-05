import * as React from "react";
import { FolderList } from "../FolderList";
import { Folder, IFolderSelection } from "../../model/Folder";
import { observer } from "mobx-react";
import { AuthorityLists } from "../../model/Project/AuthorityLists/AuthorityLists";
import { Project } from "../../model/Project/Project";
import { ComponentTab } from "../ComponentTab";
import "./PeopleTab.scss";
interface IProps {
  project: Project;
  authorityLists: AuthorityLists;
}

@observer
export class PeopleTab extends React.Component<IProps> {
  public render() {
    return (
      <ComponentTab
        project={this.props.project}
        folders={this.props.project.persons}
        selectedFolder={this.props.project.selectedPerson}
        folderTypeStyleClass="people"
        columns={["name"]}
        columnWidths={[100]}
        authorityLists={this.props.authorityLists}
      >
        <button onClick={e => this.props.project.addPerson()}>
          New Person
        </button>
      </ComponentTab>
    );
  }
}
