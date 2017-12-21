import * as React from "react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
//import SessionsPage from "../containers/SessionsPage";
import { ComponentTab } from "./ComponentTab";
import { IFolderSelection } from "../model/Folder";
import { observer } from "mobx-react";
import { Session } from "../model/Project/Session/Session";
import { Person } from "../model/Project/Person/Person";
import { Project } from "../model/Project/Project";
import { ProjectTab } from "./project/ProjectTab";
import { AuthorityLists } from "../model/Project/AuthorityLists/AuthorityLists";
const styles = require("./Home.scss");

export interface IProps {
  project: Project;
  sessions: Session[];
  persons: Person[];
  selectedSession: IFolderSelection;
  selectedPerson: IFolderSelection;
  authorityLists: AuthorityLists;
}

@observer
export default class Home extends React.Component<IProps> {
  public render() {
    return (
      <div className={styles.container} data-tid="container">
        <Tabs defaultIndex={0}>
          <TabList>
            <Tab>Project</Tab>
            <Tab>Sessions</Tab>
            <Tab>People</Tab>
          </TabList>
          <TabPanel>
            <ProjectTab
              project={this.props.project}
              authorityLists={this.props.authorityLists}
            />
          </TabPanel>
          <TabPanel>
            <ComponentTab
              folders={this.props.sessions}
              selectedFolder={this.props.selectedSession}
              folderTypeStyleClass="sessions"
              columns={["title", "date"]}
              authorityLists={this.props.authorityLists}
            />
          </TabPanel>
          <TabPanel className={styles.peopleTab}>
            <ComponentTab
              folders={this.props.persons}
              selectedFolder={this.props.selectedPerson}
              folderTypeStyleClass="people"
              columns={["name"]}
              authorityLists={this.props.authorityLists}
            />
          </TabPanel>
        </Tabs>
      </div>
    );
  }
}
