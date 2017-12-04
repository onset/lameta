import * as React from "react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import { default as SessionForm } from "./SessionForm";
import FileList from "./FileList";
import { observer } from "mobx-react";
import * as Path from "path";
import PropertyTable from "./PropertyTable";
import { ComponentFile } from "../model/ComponentFile";
import { DirectoryObject } from "../model/DirectoryObject";
import Notes from "./Notes";
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
    //console.log("Render SSPane:" + this.props.session.title.default);
    const fullPath: string = Path.join(
      this.props.directoryObject.directory,
      this.props.directoryObject.selectedFile.properties
        .getValue("name")
        .toString()
    );

    return (
      <div className={styles.filePane}>
        <h3 className={styles.paneTitle}>
          {this.props.directoryObject.getTextField("title").toString()}
        </h3>
        <FileList directoryObject={this.props.directoryObject} />
        {this.getTabs(this.props.directoryObject, fullPath)}
      </div>
    );
  }

  private getTabs(directoryObject: DirectoryObject, path: string) {
    const file = directoryObject.selectedFile;
    // console.log("getTabs:" + path);
    // console.log("getTabs:" + directoryObject.path);
    // console.log("getTabs file:" + file.type);
    if (!file) {
      return <h3>none</h3>;
    }
    const notesPanel = (
      <TabPanel>
        <Notes text={directoryObject.getTextField("notes")} />
      </TabPanel>
    );
    const propertiesPanel = (
      <TabPanel>
        <PropertyTable fields={file.properties} />
      </TabPanel>
    );
    const contributorsPanel = (
      <TabPanel>
        <h1>contributors todo</h1>
      </TabPanel>
    );

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
              <SessionForm session={directoryObject} />
              {/* Doing it this way, the form would be stuck showing the first session. Sigh, haven't figured out why.
                  <SessionForm session={this.props.directoryObject} /> */}
            </TabPanel>
            <TabPanel>todo</TabPanel>
            {notesPanel}
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
            {propertiesPanel}
            {contributorsPanel}
            {notesPanel}
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
            {propertiesPanel}
            {contributorsPanel}
            {notesPanel}
          </Tabs>
        );
      default:
        return (
          <Tabs>
            <TabList>
              <Tab>View</Tab>
              <Tab>Properties</Tab>
              <Tab>Contributors</Tab>
              <Tab>Notes</Tab>
            </TabList>
            <TabPanel>
              <h1>todo</h1>
            </TabPanel>
            {propertiesPanel}
            {contributorsPanel}
            {notesPanel}
          </Tabs>
        );
    }
  }
}

export default DirectoryPane;
