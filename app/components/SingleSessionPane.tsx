import * as React from "react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import {default as SessionForm} from "./SessionForm";
import SessionFileList from "./SessionFileList";
import {ISession} from "./SessionModel";
import { observer } from "mobx-react";
import * as path from "path";

let styles = require("./Sessions.scss");

export interface SingleSessionPaneProps {
  session: ISession;
}

@observer
export class SingleSessionPane extends React.Component<SingleSessionPaneProps> {
  render() {
  let filetypeSpecificTab = null;
  let type = this.props.session.selectedFile.type;
  let fullPath :string = path.join(this.props.session.directory, this.props.session.selectedFile.name);
    console.log(fullPath);
    console.log("type="+type);
  if(type === "Session") {
    filetypeSpecificTab = <SessionForm session={this.props.session}/>;
  } else if(type === "Image") {
    filetypeSpecificTab = <img src={fullPath}/>;
  } else if(type === "Audio") {
    console.log("Doing audio");

    filetypeSpecificTab = <audio controls>
        <source src={"file://X:/dev/sayless/test/sample/Sessions/Community Members/ETR009_Careful.mp3"}/>
      </audio>;
  }

  return (
    <div className={styles.filePane}>
      <h3 className={styles.paneTitle}>{this.props.session.title}</h3>
      {<SessionFileList session={this.props.session}/>}
      <Tabs >
      <TabList>
          <Tab>Session</Tab>
          <Tab>Properties</Tab>
          <Tab>Contributors</Tab>
          <Tab>Notes</Tab>
        </TabList>
      <TabPanel>
        {filetypeSpecificTab}
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