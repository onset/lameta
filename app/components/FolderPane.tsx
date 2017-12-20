import * as React from "react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import { default as SessionForm } from "./SessionForm";
import FileList from "./FileList";
import { observer } from "mobx-react";
import * as Path from "path";
import PropertyTable from "./PropertyTable";
import { Folder } from "../model/Folder";
import Notes from "./Notes";
import ReactPlayer from "react-player";
import PersonForm from "./PersonForm";
import { Person } from "../model/Project/Person/Person";
import { Session } from "../model/Project/Session/Session";
import TextFileView from "./TextFileView";
import AutoForm from "./AutoForm";

export interface IProps {
  folder: Folder;
  folderTypeStyleClass: string;
  showStandardMetaTabs: boolean;
}

@observer
export class FolderPane extends React.Component<IProps> {
  constructor(props: IProps) {
    super(props);
    this.getTabs = this.getTabs.bind(this);
  }

  public render() {
    if (!this.props.folder) {
      return <h1>No folder selected.</h1>;
    }
    //console.log("Render SSPane:" + this.props.session.title.default);
    const fullPath: string = this.props.folder.selectedFile
      ? Path.join(
          this.props.folder.directory,
          this.props.folder.selectedFile.getTextProperty("filename")
        )
      : "";

    return (
      <div className={"filePane " + this.props.folderTypeStyleClass}>
        {this.props.children}
        {/* <h3 className={"paneTitle"}>{this.props.folder.displayName}</h3> */}
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
    if (!file || path.length === 0) {
      return <br />;
    }
    const notesPanel = (
      <TabPanel>
        <Notes text={directoryObject.properties.getTextField("notes")} />
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
    const standardMetaTabs = this.props.showStandardMetaTabs ? (
      <>
        <Tab>Properties</Tab>
        <Tab>Contributors</Tab>
        <Tab>Notes</Tab>
      </>
    ) : null;
    const standardMetaPanels = this.props.showStandardMetaTabs ? (
      <>
        {propertiesPanel}
        {contributorsPanel}
        {notesPanel}
      </>
    ) : null;

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
              <AutoForm fields={directoryObject.properties} form="primary" />
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
              <PersonForm
                person={directoryObject as Person}
                fields={directoryObject.properties}
              />
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
              {standardMetaTabs}
            </TabList>
            <TabPanel>
              <audio controls>
                <source src={path} />
              </audio>
            </TabPanel>
            {standardMetaPanels}
          </Tabs>
        );
      case "Video":
        return (
          <Tabs>
            <TabList>
              <Tab>Video</Tab>
              {standardMetaTabs}
            </TabList>
            <TabPanel>
              <ReactPlayer url={path}>
                <source src={path} />
              </ReactPlayer>
            </TabPanel>
            {standardMetaPanels}
          </Tabs>
        );
      case "Image":
        return (
          <Tabs>
            <TabList>
              <Tab>Image</Tab>
              {standardMetaTabs}
            </TabList>
            <TabPanel>
              <img src={path} />
            </TabPanel>
            {standardMetaPanels}
          </Tabs>
        );
      case "Text":
        return (
          <Tabs>
            <TabList>
              <Tab>Text</Tab>
              {standardMetaTabs}
            </TabList>
            <TabPanel>
              <TextFileView path={path} />
            </TabPanel>
            {standardMetaPanels}
          </Tabs>
        );
      default:
        return (
          <Tabs>
            <TabList>
              <Tab>View</Tab>
              {standardMetaTabs}
            </TabList>
            <TabPanel>
              <h1>todo</h1>
            </TabPanel>
            {standardMetaPanels}
          </Tabs>
        );
    }
  }
}
