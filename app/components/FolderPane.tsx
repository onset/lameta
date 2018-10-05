import * as React from "react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import FileList from "./FileList";
import { observer } from "mobx-react";
import * as Path from "path";
import PropertyTable from "./PropertyTable";
import { Folder } from "../model/Folder";
import Notes from "./Notes";
import ReactPlayer from "react-player";
import PersonForm from "./people/person/PersonForm";
import { Person } from "../model/Project/Person/Person";
import { Session } from "../model/Project/Session/Session";
import TextFileView from "./TextFileView";
import AutoForm from "./AutoForm";
import { AuthorityLists } from "../model/Project/AuthorityLists/AuthorityLists";
import ContributorsTable from "./session/ContributorsTable";
import { Project } from "../model/Project/Project";
import ImdiView from "./ImdiView";
import { File } from "../model/file/File";
const electron = require("electron");
import "./FolderPane.scss";

const SplitPane = require("react-split-pane");

export interface IProps {
  folder: Folder;
  folderTypeStyleClass: string;
  showStandardMetaTabs: boolean;
  authorityLists: AuthorityLists;
  project: Project;
  fileListButtons?: object[];
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
          <FileList
            folder={this.props.folder}
            extraButtons={this.props.fileListButtons}
          />
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
    //console.log("getTabs:" + path);
    // console.log("getTabs:" + directoryObject.path);
    // console.log("getTabs file:" + file.type);
    if (!file || path.length === 0) {
      return <br />;
    }
    const notesPanel = directoryObject.properties.getValue("notes") ? (
      <TabPanel>
        {/* <Notes text={directoryObject.properties.getTextField("notes")} /> */}
        <Notes text={file.properties.getTextField("notes")} />
      </TabPanel>
    ) : null;
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
    const imdiPanel = (
      <TabPanel>
        <ImdiView
          target={
            file.type === "Session" || file.type === "Person"
              ? directoryObject
              : file
          }
          project={this.props.project}
        />
      </TabPanel>
    );
    const standardMetaTabs = this.props.showStandardMetaTabs ? (
      <>
        <Tab>Properties</Tab>
        <Tab>Contributors</Tab>
        <Tab>Notes</Tab>
        <Tab>IMDI</Tab>
      </>
    ) : null;

    const standardMetaPanels = this.props.showStandardMetaTabs ? (
      <>
        {propertiesPanel}
        {contributorsPanel}
        {notesPanel}
        {imdiPanel}
      </>
    ) : null;

    switch (file.type) {
      case "Session":
        const kFirstTabToOpen = 0;
        return (
          <Tabs defaultIndex={kFirstTabToOpen}>
            <TabList>
              <Tab>Session</Tab>
              <Tab>Status &amp; Stages</Tab>
              <Tab>Notes</Tab>
              <Tab>IMDI</Tab>
            </TabList>
            <TabPanel>
              <AutoForm
                folder={directoryObject}
                form="primary"
                formClass="sessionForm"
                authorityLists={this.props.authorityLists}
                fieldThatControlsFileNames={"id"}
                fieldThatControlsFileNamesMightHaveChanged={key =>
                  (this.props.folder as Session).nameMightHaveChanged()
                }
                validateFieldThatControlsFileNames={value =>
                  this.props.project.validateSessionId(
                    directoryObject as Session,
                    value
                  )
                }
                // session={directoryObject as Session}
                // authorityLists={this.props.authorityLists}
                // fields={directoryObject.properties}
                // // fieldThatControlsFileNames={"id"}
                // // fieldThatControlsFileNamesMightHaveChanged={key =>
                // //   (this.props.folder as Session).nameMightHaveChanged()
                // // }
                // validateId={value =>
                //   this.props.project.validateSessionId(
                //     directoryObject as Session,
                //     value
                //   )
                // }
              />
            </TabPanel>
            <TabPanel>
              <div className="todo">
                -- This feature has not been implemented yet --
              </div>
            </TabPanel>{" "}
            {notesPanel}
            {imdiPanel}
          </Tabs>
        );
      case "Person":
        const kFirstPersonTabToOpen = 0;
        return (
          <Tabs defaultIndex={kFirstPersonTabToOpen}>
            <TabList>
              <Tab>Person</Tab>
              <Tab>Contributions</Tab>
              <Tab>Notes</Tab>
              <Tab>IMDI</Tab>
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
            <TabPanel>
              <div className="todo">
                -- This feature has not been implemented yet --
              </div>
            </TabPanel>
            {notesPanel}
            {imdiPanel}
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
              <ReactPlayer
                url={path}
                controls
                onError={e => {
                  console.error("video error:" + e);
                }}
              />
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
              <img className="imageViewer" src={path} />
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
      case "ELAN":
        return (
          <Tabs>
            <TabList>
              <Tab>ELAN</Tab>
              {standardMetaTabs}
            </TabList>
            <TabPanel className="unhandledFileType">
              <a
                onClick={() => {
                  // the "file://" prefix is required on mac, works fine on windows
                  electron.shell.openExternal(
                    "file://" + file.describedFilePath
                  );
                }}
              >
                Open in ELAN
              </a>
            </TabPanel>
            {standardMetaPanels}
          </Tabs>
        );
      default:
        return (
          <Tabs>
            <TabList>
              <Tab>File</Tab>
              {standardMetaTabs}
            </TabList>
            <TabPanel className="unhandledFileType">
              <a
                href=""
                onClick={e => {
                  e.preventDefault(); // don't try to follow the link
                  // the "file://" prefix is required on mac, works fine on windows
                  electron.shell.openExternal(
                    "file://" + file.describedFilePath
                  );
                }}
              >
                Open in program associated with this file type
              </a>
            </TabPanel>
            {standardMetaPanels}
          </Tabs>
        );
    }
  }
}
