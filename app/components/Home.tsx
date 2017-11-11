import * as React from "react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
//import SessionsPage from "../containers/SessionsPage";
import {SessionsTab} from "./SessionsTab";
import {ISession} from "./SessionModel";
let styles = require("./Home.scss");

export interface HomeProps {
  sessions: ISession[];
}

export default class Home extends React.Component<HomeProps> {

  render() {
    return (
      <div className={styles.container} data-tid="container">
        <Tabs defaultIndex={1}>
          <TabList>
            <Tab>Project</Tab>
            <Tab>Sessions</Tab>
            <Tab>People</Tab>
          </TabList>
          <TabPanel className={styles.projectTab}>
            project
          </TabPanel>

          <TabPanel>
          <SessionsTab sessions={this.props.sessions} selectedSessionIndex={1}/>
          </TabPanel>
          <TabPanel className={styles.peopleTab}>
            people
          </TabPanel>
        </Tabs>
      </div>
    );
  }
}
