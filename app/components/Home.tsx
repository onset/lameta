import * as React from "react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
//import SessionsPage from "../containers/SessionsPage";
import { SessionsTab } from "./SessionsTab";
import { ISession, ISessionSelection } from "../model/SessionModel";
import { observer } from "mobx-react";
const styles = require("./Home.scss");

export interface IProps {
  sessions: ISession[];
  selectedSession: ISessionSelection;
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
              sessions={this.props.sessions}
              selectedSession={this.props.selectedSession}
            />
          </TabPanel>
          <TabPanel className={styles.peopleTab}>people</TabPanel>
        </Tabs>
      </div>
    );
  }
}
