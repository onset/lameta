import * as React from "react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import FileList from "./FileList";
import { observer } from "mobx-react";
import * as Path from "path";
import PropertyTable from "./PropertyTable";
import { Folder } from "../model/Folder";
import Notes from "./Notes";
import ReactPlayer from "react-player";
import PersonForm from "./person/PersonForm";
import { Person } from "../model/Project/Person/Person";
import { Session } from "../model/Project/Session/Session";
import TextFileView from "./TextFileView";
import AutoForm from "./AutoForm";
import { AuthorityLists } from "../model/Project/AuthorityLists/AuthorityLists";
import ContributorsTable from "./ContributorsTable";
import { Project } from "../model/Project/Project";
import ImdiView from "./ImdiView";
import ImdiGenerator from "../export/imdiGenerator";
import { File } from "../model/file/File";

const SplitPane = require("react-split-pane");

export interface IProps {
  folder: Folder;
  folderTypeStyleClass: string;
  showStandardMetaTabs: boolean;
  authorityLists: AuthorityLists;
  project: Project;
}

@observer
export class FolderPane extends React.Component<IProps> {
  private tabs: JSX.Element;
  private previousSelectedFile: File | null;

  constructor(props: IProps) {
    super(props);
  }

  public render() {
    if (!this.props.folder) {
      return <h1>No folder selected.</h1>;
    }

    //Without this test, getTabs() will be run on every keystroke when typing into a field.
    //But if we only do it in constructor, then we don't reset when the selected file
    //changes. We need to run it when
    if (this.previousSelectedFile !== this.props.folder.selectedFile) {
      this.previousSelectedFile = this.props.folder.selectedFile;
      this.tabs = this.getTabs(this.props.folder);
    }

    const splitterKey =
      this.props.folderTypeStyleClass + "HorizontalSplitPosition";
    const splitterposition = localStorage.getItem(splitterKey) || "300";
    const sp = parseInt(splitterposition, 10);

    return (
      <div className={"filePane " + this.props.folderTypeStyleClass}>
        {this.props.children}
        {/* <h3 className={"paneTitle"}>{this.props.folder.displayName}</h3> */}
        <SplitPane
          split="horizontal"
          minSize={100}
          defaultSize={sp}
          onChange={(size: any) => localStorage.setItem(splitterKey, size)}
        >
          <FileList folder={this.props.folder} />
          {this.tabs}
        </SplitPane>
      </div>
    );
  }

  private getTabs(directoryObject: Folder) {
    const path: string = this.props.folder.selectedFile
      ? Path.join(
          this.props.folder.directory,
          this.props.folder.selectedFile.getTextProperty("filename")
        )
      : "";
    const file = directoryObject.selectedFile;
    console.log("getTabs:" + path);
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
        <ContributorsTable
          // contributions={file.contributions}
          file={file}
          authorityLists={this.props.authorityLists}
        />
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
        const kFirstTabToOpen = 4;
        return (
          <Tabs defaultIndex={kFirstTabToOpen}>
            <TabList>
              <Tab>Session</Tab>
              <Tab>Properties</Tab>
              <Tab>Status &amp; Stages</Tab>
              <Tab>Notes</Tab>
              <Tab>IMDI</Tab>
            </TabList>
            <TabPanel>
              <AutoForm
                folder={directoryObject}
                form="primary"
                authorityLists={this.props.authorityLists}
                fieldThatControlsFileNames={"id"}
                fieldThatControlsFileNamesMightHaveChanged={key =>
                  (this.props.folder as Session).nameMightHaveChanged(key)
                }
                validateFieldThatControlsFileNames={value =>
                  this.props.project.validateSessionId(
                    directoryObject as Session,
                    value
                  )
                }
              />
            </TabPanel>
            {propertiesPanel}
            <TabPanel>todo</TabPanel>
            {notesPanel}
            <TabPanel>
              <ImdiView folder={directoryObject} />
            </TabPanel>
          </Tabs>
        );
      case "Person":
        return (
          <Tabs>
            <TabList>
              <Tab>Person</Tab>
              <Tab>Properties</Tab>
              <Tab>Notes</Tab>
            </TabList>
            <TabPanel>
              <PersonForm
                validateFullName={value => {
                  return this.props.project.validatePersonFullName(
                    directoryObject as Person,
                    value
                  );
                }}
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
