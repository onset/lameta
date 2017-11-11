
import * as React from "react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import {default as SessionForm} from "./SessionForm";
import SessionFileList from "./SessionFileList";
import {ISession, IFile} from "./SessionModel";

let styles = require("./Sessions.scss");

export interface SingleSessionPaneProps {
  session: ISession;
}

export class SingleSessionPane extends React.Component<SingleSessionPaneProps> {

  //eventually the files wil come from the selected session
  filesOfSession: IFile[] = [
      {name:"Community Members", type:"Session",date:"11-10-17",size:"690 B"},
      {name:"community_members.eaf",type:"ELAN",date:"11-10-17",size:"111 KB"},
      {name:"community_members.mp3",type:"Audio",date:"11-10-17", size:"47kb"}];

  render() {

  return (
    <div className={styles.filePane}>
      <h3 className={styles.paneTitle}>{this.props.session.title}</h3>
      {<SessionFileList files={this.filesOfSession}/>}
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