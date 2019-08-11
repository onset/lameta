import * as React from "react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import FileList from "./FileList";
import { observer } from "mobx-react-lite";
import * as Path from "path";
import PropertyPanel from "./PropertyPanel";
import { Folder } from "../model/Folder";
import Notes from "./Notes";
import StatusControl from "./StatusControl";
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
import { File, Contribution } from "../model/file/File";
const electron = require("electron");
import "./FolderPane.scss";
import SMErrorBoundary from "./SMErrorBoundary";
import { PersonContributions } from "./PersonContributions";
import { Trans } from "@lingui/react";
import userSettings from "../UserSettings";
import SplitPane from "react-split-pane";

export interface IProps {
  folder: Folder;
  folderTypeStyleClass: string;
  showStandardMetaTabs: boolean;
  authorityLists: AuthorityLists;
  project: Project;
  fileListButtons?: object[];
}

export const FolderPane = observer<
  IProps & React.HTMLAttributes<HTMLDivElement>
>((props: any) => {
  const [tabIndex, setTabIndex] = React.useState(0);
  const [selectedContribution, setSelectedContribution] = React.useState<
    Contribution | undefined
  >(undefined);

  if (!props.folder) {
    return <h1>No folder selected.</h1>;
  }

  const tabs = getTabs(
    props,
    tabIndex,
    setTabIndex,
    selectedContribution,
    setSelectedContribution
  );
  const splitterKey = props.folderTypeStyleClass + "HorizontalSplitPosition";
  const splitterposition = localStorage.getItem(splitterKey) || "300";
  const sp = parseInt(splitterposition, 10);

  return (
    <div className={"filePane " + props.folderTypeStyleClass}>
      {props.children}
      {/* <h3 className={"paneTitle"}>{props.folder.displayName}</h3> */}
      <SplitPane
        split="horizontal"
        minSize={100}
        defaultSize={sp}
        onChange={(size: any) => localStorage.setItem(splitterKey, size)}
      >
        <FileList folder={props.folder} extraButtons={props.fileListButtons} />
        {tabs}
      </SplitPane>
    </div>
  );
});

function getTabs(
  props: React.PropsWithChildren<IProps & React.HTMLAttributes<HTMLDivElement>>,
  tabIndex: number,
  setTabIndex: (index: number) => void,
  selectedContribution: Contribution | undefined,
  setSelectedContribution: (c: Contribution | undefined) => void
) {
  const path: string = props.folder.selectedFile
    ? Path.join(
        props.folder.directory,
        props.folder.selectedFile.getTextProperty("filename")
      )
    : "";
  const directoryObject = props.folder;
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
      <Notes field={file.properties.getTextField("notes")} />
    </TabPanel>
  ) : null;
  const propertiesPanel = (
    <TabPanel>
      <PropertyPanel file={file} />
    </TabPanel>
  );
  const contributorsPanel = (
    <TabPanel>
      <ContributorsTable
        // contributions={file.contributions}
        file={file}
        authorityLists={props.authorityLists}
        selectContribution={selectedContribution}
      />
    </TabPanel>
  );
  const imdiTab = userSettings.ShowIMDIPanels ? (
    <Tab>IMDI {/* don't translate  */}</Tab>
  ) : (
    <></>
  );

  const imdiPanel = userSettings.ShowIMDIPanels ? (
    <TabPanel>
      <ImdiView
        target={
          file.type === "Session" || file.type === "Person"
            ? directoryObject
            : file
        }
        project={props.project}
      />
    </TabPanel>
  ) : (
    <></>
  );

  const standardMetaTabs = props.showStandardMetaTabs ? (
    <>
      <Tab>
        <Trans>Properties</Trans>
      </Tab>
      <Tab>
        <Trans>Contributors</Trans>
      </Tab>
      <Tab>
        <Trans>Notes</Trans>
      </Tab>
      {imdiTab}
    </>
  ) : null;

  const standardMetaPanels = props.showStandardMetaTabs ? (
    <>
      {propertiesPanel}
      {contributorsPanel}
      {notesPanel}
      {imdiPanel}
    </>
  ) : null;

  // by preventing re-use of the Tabs element, it causes us to reset to the first tab when the file changes
  const tabsKey = props.folder.selectedFile!.getTextProperty("filename");

  switch (file.type) {
    case "Session":
      return (
        <Tabs
          key={tabsKey}
          selectedIndex={tabIndex}
          onSelect={i => {
            setTabIndex(i);
            // when we leave the Contributors tab, forget about any selected row
            if (i !== 1) {
              setSelectedContribution(undefined);
            }
            return true;
          }}
        >
          <TabList>
            <Tab>
              <Trans>Session</Trans>
            </Tab>
            <Tab>
              <Trans>Contributors</Trans>
            </Tab>
            <Tab>
              <Trans>Status</Trans>
            </Tab>
            <Tab>
              <Trans>Notes</Trans>
            </Tab>
            {imdiTab}
          </TabList>
          <TabPanel>
            <SMErrorBoundary
              context={`${directoryObject.displayName} ${
                directoryObject.metadataFile!.describedFilePath
              } Session AutoForm`}
            >
              <AutoForm
                folder={directoryObject}
                form="primary"
                formClass="sessionForm"
                authorityLists={props.authorityLists}
                languageFinder={props.project.languageFinder}
                //customFieldNames={props.customFieldNames}
                fieldThatControlsFileNames={"id"}
                fieldThatControlsFileNamesMightHaveChanged={key =>
                  (props.folder as Session).nameMightHaveChanged()
                }
                validateFieldThatControlsFileNames={value =>
                  props.project.validateSessionId(
                    directoryObject as Session,
                    value
                  )
                }
                onShowContributorsTab={c => {
                  setSelectedContribution(c);
                  setTabIndex(1);
                }}
              />
            </SMErrorBoundary>
          </TabPanel>
          {contributorsPanel}
          <TabPanel>
            <StatusControl
              statusField={directoryObject.properties.getTextField("status")}
            />
          </TabPanel>

          {notesPanel}
          {imdiPanel}
        </Tabs>
      );
    case "Person":
      const kFirstPersonTabToOpen = 0;
      return (
        <Tabs key={tabsKey} defaultIndex={kFirstPersonTabToOpen}>
          <TabList>
            <Tab>
              <Trans>Person</Trans>
            </Tab>
            <Tab>
              <Trans>Contributions</Trans>
            </Tab>
            <Tab>
              <Trans>Notes</Trans>
            </Tab>
            {imdiTab}
          </TabList>
          <TabPanel>
            <SMErrorBoundary
              context={`${directoryObject.displayName} ${
                directoryObject.metadataFile!.describedFilePath
              } PersonForm`}
            >
              <PersonForm
                validateFullName={value => {
                  return props.project.validatePersonFullName(
                    directoryObject as Person,
                    value
                  );
                }}
                validateCode={value => {
                  return props.project.validatePersonCode(
                    directoryObject as Person,
                    value
                  );
                }}
                person={directoryObject as Person}
                fields={directoryObject.properties}
              />
            </SMErrorBoundary>
          </TabPanel>
          <TabPanel>
            <PersonContributions
              person={directoryObject as Person}
              project={props.project}
            />
          </TabPanel>
          {notesPanel}
          {imdiPanel}
        </Tabs>
      );
    case "Audio":
      return (
        <Tabs key={tabsKey}>
          <TabList>
            <Tab>
              <Trans>Audio</Trans>
            </Tab>
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
        <Tabs key={tabsKey}>
          <TabList>
            <Tab>
              <Trans>Video</Trans>
            </Tab>
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
        <Tabs key={tabsKey}>
          <TabList>
            <Tab>
              <Trans>Image</Trans>
            </Tab>
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
        <Tabs key={tabsKey}>
          <TabList>
            <Tab>
              <Trans>Text</Trans>
            </Tab>
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
        <Tabs key={tabsKey}>
          <TabList>
            <Tab>ELAN {/* should not be translated */}</Tab>
            {standardMetaTabs}
          </TabList>
          <TabPanel className="unhandledFileType">
            <a
              onClick={() => {
                // the "file://" prefix is required on mac, works fine on windows
                electron.shell.openExternal("file://" + file.describedFilePath);
              }}
            >
              <Trans>Open in ELAN</Trans>
            </a>
          </TabPanel>
          {standardMetaPanels}
        </Tabs>
      );
    default:
      return (
        <Tabs key={tabsKey}>
          <TabList>
            <Tab>
              <Trans>File</Trans>
            </Tab>
            {standardMetaTabs}
          </TabList>
          <TabPanel className="unhandledFileType">
            <a
              href=""
              onClick={e => {
                e.preventDefault(); // don't try to follow the link
                // the "file://" prefix is required on mac, works fine on windows
                electron.shell.openExternal("file://" + file.describedFilePath);
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
