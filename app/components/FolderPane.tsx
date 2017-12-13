import * as React from "react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import { default as SessionForm } from "./SessionForm";
import FileList from "./FileList";
import { observer } from "mobx-react";
import * as Path from "path";
import PropertyTable from "./PropertyTable";
import { File } from "../model/File";
import { Folder } from "../model/Folder";
import Notes from "./Notes";
import ReactPlayer from "react-player";
import PersonForm from "./PersonForm";
import { Person } from "../model/Person";

export interface IProps {
  folder: Folder;
  folderTypeStyleClass: string;
}

@observer
export class FolderPane extends React.Component<IProps> {
  private filetypeSpecificTab: any; // enhance: what's the real type?

  constructor(props: IProps) {
    super(props);
    this.getTabs = this.getTabs.bind(this);
  }

  public render() {
    if (!this.props.folder) {
      return <h1>No folder selected.</h1>;
    }
    //console.log("Render SSPane:" + this.props.session.title.default);
    const fullPath: string = Path.join(
      this.props.folder.directory,
      this.props.folder.selectedFile.properties.getValue("filename").toString()
    );

    return (
      <div className={"filePane " + this.props.folderTypeStyleClass}>
        <h3 className={"paneTitle"}>{this.props.folder.displayName}</h3>
        <FileList folder={this.props.folder} />
        {this.getTabs(this.props.folder, fullPath)}
      </div>
    );
  }

  private getTabs(directoryObject: Folder, path: string) {
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
              <Tab>Properties</Tab>
              <Tab>Status &amp; Stages</Tab>
              <Tab>Notes</Tab>
            </TabList>
            <TabPanel>
              <SessionForm session={directoryObject} />
              {/* Doing it this way, the form would be stuck showing the first session. Sigh, haven't figured out why.
                  <SessionForm session={this.props.directoryObject} /> */}
            </TabPanel>
            {propertiesPanel}
            <TabPanel>todo</TabPanel>
            {notesPanel}
          </Tabs>
        );
      case "Person":
        return (
          <Tabs>
            <TabList>
              <Tab>Session</Tab>
              <Tab>Properties</Tab>
              <Tab>Notes</Tab>
            </TabList>
            <TabPanel>
              <PersonForm person={directoryObject as Person} />
            </TabPanel>
            {propertiesPanel}
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
      case "Video":
        return (
          <Tabs>
            <TabList>
              <Tab>Video</Tab>
              <Tab>Properties</Tab>
              <Tab>Contributors</Tab>
              <Tab>Notes</Tab>
            </TabList>
            <TabPanel>
              <ReactPlayer url={path}>
                <source src={path} />
              </ReactPlayer>
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

export default FolderPane;
