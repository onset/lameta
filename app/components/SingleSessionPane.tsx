import * as React from "react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import { default as SessionForm } from "./SessionForm";
import SessionFileList from "./SessionFileList";
import { Session } from "../model/Session";
import { observer } from "mobx-react";
import * as path from "path";
const styles = require("./Sessions.scss");

export interface IProps {
  session: Session;
}

@observer
export class SingleSessionPane extends React.Component<IProps> {
  private filetypeSpecificTab: any; // enhance: what's the real type?

  constructor(props: IProps) {
    super(props);
  }

  public render() {
    //console.log("Render SSPane:" + this.props.session.title.default());
    const fullPath: string = path.join(
      this.props.session.directory,
      this.props.session.selectedFile.name
    );

    const typesToTabs: { [type: string]: any } = {
      Session: <SessionForm session={this.props.session} />,
      Image: <img src={fullPath} />,
      Audio: (
        <audio controls>
          <source src={fullPath} />
        </audio>
      )
    };
    this.filetypeSpecificTab =
      typesToTabs[this.props.session.selectedFile.type];

    console.log(
      `Render SSPane: ${this.props.session.title.default()}   ${
        this.filetypeSpecificTab.type
      }    ${this.props.session.selectedFile.name}`
    );
    return (
      <div className={styles.filePane}>
        <h3 className={styles.paneTitle}>
          {this.props.session.title.default()}
        </h3>
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
