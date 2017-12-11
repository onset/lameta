import * as React from "react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
//import SessionsPage from "../containers/SessionsPage";
import { SessionsTab } from "./SessionsTab";
import { Folder, IFolderSelection } from "../model/Folder";
import { observer } from "mobx-react";
import { Session } from "../model/Session";
import { Person } from "../model/Person";
const styles = require("./Home.scss");

export interface IProps {
  sessions: Session[];
  persons: Person[];
  selectedSession: IFolderSelection;
  selectedPerson: IFolderSelection;
}

@observer
export default class Home extends React.Component<IProps> {
  public render() {
    return (
      <div className={styles.container} data-tid="container">
        <Tabs defaultIndex={1}>
          <TabList>
            <Tab>Project</Tab>
            <Tab>Sessions</Tab>
            <Tab>People</Tab>
          </TabList>
          <TabPanel className={styles.projectTab}>project</TabPanel>

          <TabPanel>
            <SessionsTab
              folders={this.props.sessions}
              selectedFolder={this.props.selectedSession}
              folderTypeStyleClass="sessions"
            />
          </TabPanel>
          <TabPanel className={styles.peopleTab}>
            <SessionsTab
              folders={this.props.persons}
              selectedFolder={this.props.selectedPerson}
              folderTypeStyleClass="people"
            />
          </TabPanel>
        </Tabs>
      </div>
    );
  }
}
