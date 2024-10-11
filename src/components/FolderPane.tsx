import * as React from "react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import { FileList } from "./FileList";
import { observer } from "mobx-react";
import * as Path from "path";
import PropertyPanel from "./PropertyPanel";
import { Folder } from "../model/Folder/Folder";
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
import { ImdiView } from "./ImdiView";
import { Contribution } from "../model/file/File";
const electron = require("electron");
import "./FolderPane.scss";
import { PersonContributions } from "./PersonContributions";
import { Trans } from "@lingui/macro";
import SplitPane from "react-split-pane";
import { ParadisecView } from "./ParadisecView";
import { NotifyError } from "./Notify";

import * as URL from "url";
import { FileStatusBlock } from "../model/file/FileStatus";
import { ErrorBoundary } from "./ErrorBoundary";
import { useLingui } from "@lingui/react";
import { GetOtherConfigurationSettings } from "../model/Project/OtherConfigurationSettings";
import { RoCrateView } from "./RoCrate/RoCrateView";
import userSettingsSingleton from "../other/UserSettings";

export interface IProps {
  folder: Folder;
  folderTypeStyleClass: string;
  showStandardMetaTabs: boolean;
  authorityLists: AuthorityLists;
  project: Project;
  fileListButtons?: object[];
}

// avoids a console error every time react-player tries to come up with a preview of the video
const dummyPreviewImage: string =
  URL.pathToFileURL(`assets/invisible.png`).toString();

export const FolderPane: React.FunctionComponent<
  IProps & React.HTMLAttributes<HTMLDivElement>
> = (props) => {
  //const [tabs, setTabs] = React.useState<JSX.Element>(<React.Fragment />);
  if (!props.folder) {
    return <h1>No folder selected.</h1>;
  }

  // useEffect(() => {
  //   console.log(`generating tabs`);
  //   setTabs(
  //     getTabs(
  //       props,
  //       selectedContribution,
  //       setSelectedContribution
  //     )
  //   );
  // }, [props.folder, props.folder.SelectedFile]);

  const splitterKey = props.folderTypeStyleClass + "HorizontalSplitPosition";
  const splitterposition = localStorage.getItem(splitterKey) || "300";
  const sp = parseInt(splitterposition, 10);

  props.folder.runSanityCheck();

  return (
    <div className={"folderPane " + props.folderTypeStyleClass}>
      {(props as any).children}
      {/* <h3 className={"paneTitle"}>{props.folder.displayName}</h3> */}
      <SplitPane
        split="horizontal"
        minSize={100}
        defaultSize={sp}
        onChange={(size: any) => localStorage.setItem(splitterKey, size)}
      >
        <FileList folder={props.folder} extraButtons={props.fileListButtons} />
        <div className="folder-bottom-pane">
          {props.folder.selectedFile && (
            <>
              <FileStatusBlock file={props.folder.selectedFile} />
              <ErrorBoundary>
                <FileTabs {...props} />
              </ErrorBoundary>
            </>
          )}
        </div>
      </SplitPane>
    </div>
  );
};

const FileTabs: React.FunctionComponent<
  IProps & React.HTMLAttributes<HTMLDivElement>
> = observer((props) => {
  useLingui();
  const [tabIndex, setTabIndex] = React.useState(
    userSettingsSingleton.DeveloperMode ? 4 : 0
  );

  const [selectedContribution, setSelectedContribution] =
    React.useState<Contribution | undefined>(undefined);

  // tabIndex: number,
  // setTabIndex: (index: number) => void,
  // selectedContribution: Contribution | undefined,
  // setSelectedContribution: (c: Contribution | undefined) => void
  //) {
  const path: string = props.folder.selectedFile
    ? props.folder.selectedFile.getActualFilePath()
    : // ? Path.join(
      //     props.folder.directory,
      //     props.folder.selectedFile.getTextProperty("filename")
      //   )
      "";
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
  const imdiTab = GetOtherConfigurationSettings().showImdiPreview ? (
    <Tab>IMDI {/* don't translate  */}</Tab>
  ) : (
    <></>
  );
  const paradisecTab = GetOtherConfigurationSettings().showParadisec ? (
    <Tab>PARADISEC {/* don't translate  */}</Tab>
  ) : (
    <></>
  );
  const roCrateTab =
    userSettingsSingleton.DeveloperMode ||
    GetOtherConfigurationSettings().showRoCrate ? (
      <Tab>Ro-Crate {/* don't translate  */}</Tab>
    ) : (
      <></>
    );

  const imdiPanel = GetOtherConfigurationSettings().showImdiPreview ? (
    <TabPanel>
      <ErrorBoundary>
        <ImdiView
          target={
            file.type === "Session" || file.type === "Person"
              ? directoryObject
              : file
          }
          folder={props.folder}
          project={props.project}
        />
      </ErrorBoundary>
    </TabPanel>
  ) : (
    <></>
  );
  const paradisecPanel = GetOtherConfigurationSettings().showParadisec ? (
    <TabPanel>
      <ErrorBoundary>
        <ParadisecView
          target={
            file.type === "Session" || file.type === "Person"
              ? directoryObject
              : file
          }
          folder={props.folder}
          project={props.project}
        />
      </ErrorBoundary>
    </TabPanel>
  ) : (
    <></>
  );
  const roCratePanel =
    userSettingsSingleton.DeveloperMode ||
    GetOtherConfigurationSettings().showRoCrate ? (
      <TabPanel>
        <ErrorBoundary>
          <RoCrateView folder={props.folder} project={props.project} />
        </ErrorBoundary>
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
      {paradisecPanel}
      {roCratePanel}
    </>
  ) : null;

  // by preventing re-use of the Tabs element, it causes us to reset to the first tab when the file changes
  const tabsKey = props.folder.selectedFile!.getTextProperty("filename");

  let t = file.type;
  const ext = Path.extname(file.getActualFilePath());
  if ([".txt", ".md"].includes(ext)) t = "Text";

  switch (t) {
    case "Session":
      return (
        <Tabs
          key={tabsKey}
          selectedIndex={tabIndex}
          onSelect={(i) => {
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
            {imdiTab} {paradisecTab} {roCrateTab}
          </TabList>
          <TabPanel>
            <ErrorBoundary
              context={`${directoryObject.displayName} ${
                directoryObject.metadataFile!.pathInFolderToLinkFileOrLocalCopy
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
                fieldThatControlsFileNamesMightHaveChanged={(key) =>
                  (props.folder as Session).nameMightHaveChanged()
                }
                validateFieldThatControlsFileNames={(value) =>
                  props.project.validateSessionId(
                    directoryObject as Session,
                    value
                  )
                }
                onShowContributorsTab={(c) => {
                  setSelectedContribution(c);
                  setTabIndex(1);
                }}
              />
            </ErrorBoundary>
          </TabPanel>
          {contributorsPanel}
          <TabPanel>
            <StatusControl
              statusField={directoryObject.properties.getTextField("status")}
            />
          </TabPanel>

          {notesPanel}
          {imdiPanel}
          {paradisecPanel}
          {roCratePanel}
        </Tabs>
      );
    case "Person": {
      const kFirstPersonTabToOpen = userSettingsSingleton.DeveloperMode ? 3 : 0;
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
            {roCrateTab}
          </TabList>
          <TabPanel>
            <ErrorBoundary
              context={`${directoryObject.displayName} ${
                directoryObject.metadataFile!.pathInFolderToLinkFileOrLocalCopy
              } PersonForm`}
            >
              <PersonForm
                validateFullName={(value) => {
                  return props.project.validatePersonFullName(
                    directoryObject as Person,
                    value
                  );
                }}
                validateCode={(value) => {
                  return props.project.validatePersonCode(
                    directoryObject as Person,
                    value
                  );
                }}
                person={directoryObject as Person}
                fields={directoryObject.properties}
                languageFinder={props.project.languageFinder}
              />
            </ErrorBoundary>
          </TabPanel>
          <TabPanel>
            <PersonContributions
              person={directoryObject as Person}
              project={props.project}
            />
          </TabPanel>
          {notesPanel}
          {imdiPanel}
          {roCratePanel}
        </Tabs>
      );
    }
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
              <source src={`file://${path}`} />
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
              //config={{ file: { forceHLS: true } }}
              // don't show the actual video, as that tends to lock the file and mess up file and folder renaming
              light={dummyPreviewImage}
              playing={true} // start playing when the "light" play button is clicked
              url={`file://${path}`}
              controls
              onError={(e) => {
                NotifyError("video error:" + e);
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
            <img
              className="imageViewer"
              // file:// is required on mac
              src={`file:///${path.replace(/#/g, "%23")}`}
            />
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
            {/* NB: not a url, just a file here path */}
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
                electron.shell.openExternal(
                  "file://" + file.getActualFilePath()
                );
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
              onClick={(e) => {
                e.preventDefault(); // don't try to follow the link
                // the "file://" prefix is required on mac, works fine on windows
                electron.shell.openPath("file://" + file.getActualFilePath());
              }}
            >
              Open in program associated with this file type
            </a>
          </TabPanel>
          {standardMetaPanels}
        </Tabs>
      );
  }
});
export default observer(FolderPane);
