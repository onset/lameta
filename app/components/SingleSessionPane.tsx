import * as React from "react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import { default as SessionForm } from "./SessionForm";
import SessionFileList from "./SessionFileList";
import { Session } from "../model/Session";
import { observer } from "mobx-react";
import * as Path from "path";
import PropertyTable from "./PropertyTable";
import { ComponentFile } from "../model/ComponentFile";
const styles = require("./Sessions.scss");

export interface IProps {
  session: Session;
}

@observer
export class SingleSessionPane extends React.Component<IProps> {
  private filetypeSpecificTab: any; // enhance: what's the real type?

  constructor(props: IProps) {
    super(props);
    this.getTabs = this.getTabs.bind(this);
  }

  public render() {
    //console.log("Render SSPane:" + this.props.session.title.default());
    const fullPath: string = Path.join(
      this.props.session.directory,
      this.props.session.selectedFile.name
    );

    return (
      <div className={styles.filePane}>
        <h3 className={styles.paneTitle}>
          {this.props.session.title.default()}
        </h3>
        <SessionFileList session={this.props.session} />
        {this.getTabs(this.props.session.selectedFile, fullPath)}
      </div>
    );
  }

  private getTabs(file: ComponentFile, path: string) {
    if (!file) {
      return <h3>none</h3>;
    }

    switch (file.type) {
      case "Session":
        return (
          <Tabs>
            <TabList>
              <Tab>Session</Tab>
              <Tab>Status &amp; Stages</Tab>
              <Tab>Notes</Tab>
            </TabList>
            <TabPanel>
              <SessionForm session={this.props.session} />
            </TabPanel>
            <TabPanel>todo</TabPanel>
            <TabPanel>todo</TabPanel>
          </Tabs>
        );
      case "Audio":
        return (
          <Tabs>
            <TabList>
              <Tab>Audio</Tab>
              <Tab>Properties</Tab>
              <Tab>Contributors</Tab>
              <Tab>Notes</Tab>
            </TabList>
            <TabPanel>
              <audio controls>
                <source src={path} />
              </audio>
            </TabPanel>
            <TabPanel>
              <PropertyTable file={file} />
            </TabPanel>
            <TabPanel>todo</TabPanel>
            <TabPanel>todo</TabPanel>
          </Tabs>
        );
      case "Image":
        return (
          <Tabs>
            <TabList>
              <Tab>Image</Tab>
              <Tab>Properties</Tab>
              <Tab>Contributors</Tab>
              <Tab>Notes</Tab>
            </TabList>
            <TabPanel>
              <img src={path} />,
            </TabPanel>
            <TabPanel>
              <PropertyTable file={file} />
            </TabPanel>
            <TabPanel>todo</TabPanel>
            <TabPanel>todo</TabPanel>
          </Tabs>
        );
      default:
        return <h3>unknown type stuff</h3>;
    }
  }
}

export default SingleSessionPane;
