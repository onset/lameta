import * as React from "react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import { default as SessionForm } from "./SessionForm";
import SessionFileList from "./SessionFileList";
import { ISession } from "../model/SessionModel";
import { observer } from "mobx-react";
import * as path from "path";
const styles = require("./Sessions.scss");

export interface IProps {
  session: ISession;
}

@observer
export class SingleSessionPane extends React.Component<IProps> {
  private filetypeSpecificTab: any; // enhance: what's the real type?

  constructor(props: IProps) {
    super(props);

    const fullPath: string = path.join(
      this.props.session.directory,
      this.props.session.selectedFile.name
    );

    const typesToTabs: { [type: string]: any } = {
      Session: <SessionForm session={this.props.session} />,
      Image: <img src={fullPath} />,
      Audio: (
        <audio controls>
          <source
            src={
              "file://X:/dev/sayless/test/sample/Sessions/Community Members/ETR009_Careful.mp3"
            }
          />
        </audio>
      )
    };
    this.filetypeSpecificTab =
      typesToTabs[this.props.session.selectedFile.type];
  }

  public render() {
    return (
      <div className={styles.filePane}>
        <h3 className={styles.paneTitle}>{this.props.session.title}</h3>
        {<SessionFileList session={this.props.session} />}

        <Tabs>
          <TabList>
            <Tab>Session</Tab>
            <Tab>Properties</Tab>
            <Tab>Contributors</Tab>
            <Tab>Notes</Tab>
          </TabList>
          <TabPanel>{this.filetypeSpecificTab}</TabPanel>
          <TabPanel>aaa</TabPanel>
          <TabPanel>aaa</TabPanel>
          <TabPanel>aaa</TabPanel>
        </Tabs>
      </div>
    );
  }
}

export default SingleSessionPane;
