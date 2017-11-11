import * as React from "react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import SessionsPage from "../containers/SessionsPage";
let styles = require("./Home.scss");

export default class Home extends React.Component {
  render() {
    return (
      <div className={styles.container} data-tid="container">
        <Tabs >
          <TabList>
            <Tab>Project</Tab>
            <Tab>Sessions</Tab>
            <Tab>People</Tab>
          </TabList>
          <TabPanel className={styles.projectTab}>
            project
          </TabPanel>

          <TabPanel>
          <SessionsPage />
          </TabPanel>
          <TabPanel className={styles.peopleTab}>
            people
          </TabPanel>
        </Tabs>
      </div>
    );
  }
}
