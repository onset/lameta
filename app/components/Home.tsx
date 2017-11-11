import * as React from "react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
let styles = require("./Home.scss");

export default class Home extends React.Component {
  render() {
    return (
      <div className={styles.container} data-tid="container">
        <Tabs >
          <TabList>
            {/* <Tab><MdFolder size={25} className="projectTab" />Project</Tab>
    <Tab><FaComments size={25} className="sessionsTab" />Sessions</Tab>
    <Tab><FaUser size={25} className="peopleTab" />People</Tab> */}
            <Tab>Project</Tab>
            <Tab>Sessions</Tab>
            <Tab>People</Tab>
          </TabList>
          <TabPanel>
            project
  </TabPanel>

          <TabPanel>
            session
          </TabPanel>
          <TabPanel>
            people
  </TabPanel>
        </Tabs>
      </div>
    );
  }
}
