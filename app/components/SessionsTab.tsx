
import * as React from "react";
import { RouteComponentProps } from "react-router";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import {default as SessionForm} from "./SessionForm";
import SessionList from "./SessionList";
import SessionFileList from "./SessionFileList";

let styles = require("./Sessions.scss");

export interface IProps extends RouteComponentProps<any> {
}

export class SessionsTab extends React.Component<any> {

  render() {

  return (
      <div className={styles.sessionsScreen}>
        <div className={styles.filesAndDetails}>
          {<SessionList/>}
          <div className={styles.filePane}>
            {<SessionFileList/>}
            <Tabs >
            <TabList>
                <Tab>Session</Tab>
                <Tab>Properties</Tab>
                <Tab>Contributors</Tab>
                <Tab>Notes</Tab>
              </TabList>
            <TabPanel>
              {<SessionForm/>}
            </TabPanel>
            <TabPanel>
              aaa
            </TabPanel>
            <TabPanel>
              aaa
            </TabPanel>
            <TabPanel>
              aaa
            </TabPanel>
          </Tabs>
          </div>
        </div>
      </div>
    );
  }
}

export default SessionsTab;