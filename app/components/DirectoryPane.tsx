import * as React from "react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import { default as SessionForm } from "./SessionForm";
import FileList from "./FileList";
import { observer } from "mobx-react";
import * as Path from "path";
import PropertyTable from "./PropertyTable";
import { ComponentFile } from "../model/ComponentFile";
import { DirectoryObject } from "../model/BaseModel";
const styles = require("./Sessions.scss");

export interface IProps {
  directoryObject: DirectoryObject;
}

@observer
export class DirectoryPane extends React.Component<IProps> {
  private filetypeSpecificTab: any; // enhance: what's the real type?

  constructor(props: IProps) {
    super(props);
    this.getTabs = this.getTabs.bind(this);
  }

  public render() {
    //console.log("Render SSPane:" + this.props.session.title.default());
    const fullPath: string = Path.join(
      this.props.directoryObject.directory,
      this.props.directoryObject.selectedFile.properties
        .getValue("name")
        .default()
    );

    return (
      <div className={styles.filePane}>
        <h3 className={styles.paneTitle}>
          {this.props.directoryObject.properties.getValue("title").default()}
        </h3>
        <FileList directoryObject={this.props.directoryObject} />
        {this.getTabs(this.props.directoryObject.selectedFile, fullPath)}
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
              <SessionForm session={this.props.directoryObject} />
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
              <PropertyTable properties={file.properties} />
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
              <PropertyTable properties={file.properties} />
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

export default DirectoryPane;
