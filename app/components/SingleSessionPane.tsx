
import * as React from "react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import {default as SessionForm} from "./SessionForm";
import SessionFileList from "./SessionFileList";
import {ISession} from "./SessionModel";

let styles = require("./Sessions.scss");

export interface SingleSessionPaneProps {
  session: ISession;
}

export class SingleSessionPane extends React.Component<SingleSessionPaneProps> {
  render() {

  return (
    <div className={styles.filePane}>
      <h3 className={styles.paneTitle}>{this.props.session.title}</h3>
      {<SessionFileList files={this.props.session.files}/>}
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
    );
  }
}

export default SingleSessionPane;