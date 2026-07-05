import * as React from "react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import { FileList } from "./FileList";
import { observer } from "mobx-react";
import { runInAction } from "mobx";
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
import "./FolderPane.css";
import { PersonContributions } from "./PersonContributions";
import { Trans } from "@lingui/macro";
import SplitPane from "react-split-pane";
import { ParadisecView } from "./ParadisecView";
import { NotifyError } from "./Notify";
import userSettings from "../other/UserSettings";
import * as URL from "url";
import { getMediaFolderOrEmptyForThisProjectAndMachine } from "../model/Project/MediaFolderAccess";
import { FileStatusBlock } from "../model/file/FileStatus";
import { useEffect } from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import { useLingui } from "@lingui/react";
import { GetOtherConfigurationSettings } from "../model/Project/OtherConfigurationSettings";
import { SearchContext } from "./SearchContext";
import { css } from "@emotion/react";
import { RoCrateView } from "./RoCrate/RoCrateView";
import userSettingsSingleton from "../other/UserSettings";
import { HighlightableTab } from "./HighlightableTab";
import { TiffViewer } from "./TiffViewer";
import AccessChooser from "./session/AccessChooser";
import { TextFieldEdit } from "./TextFieldEdit";
import { getSessionFormClass } from "./session/SessionFormVariant";
import pluginManager from "../plugins/PluginManager";
import { computeDefaultIndex } from "../plugins/pluginMatching";
import tabProviderHost, {
  MatchedProviderTab
} from "../plugins/tabProviderHost";
import { localizeLabel } from "../plugins/PluginManifest";
import { getMimeType } from "../model/file/FileTypeInfo";
import { currentUILanguage } from "../other/localization";
import { PluginTab } from "./PluginTab";
import { PluginTabPanel } from "./PluginTabPanel";
import pkg from "package.json";

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

const FileDisplay = observer((props: { folder: Folder }) => {
  const selectedFile = props.folder.selectedFile;
  return selectedFile ? (
    <div>Current File: {selectedFile.getTextProperty("filename")}</div>
  ) : null;
});

export const FolderPane: React.FunctionComponent<
  IProps & React.HTMLAttributes<HTMLDivElement>
> = observer((props) => {
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

  const isProjectDocumentsFolder =
    props.folder.folderType === "project documents" ||
    props.folderTypeStyleClass === "project-documents";

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
        <FileList
          folder={props.folder}
          extraButtons={props.fileListButtons}
          showAccessColumn={isProjectDocumentsFolder}
        />
        <div className="folder-bottom-pane">
          {props.folder.selectedFile && (
            <>
              <FileStatusBlock
                folder={props.folder}
                file={props.folder.selectedFile}
                fileName={props.folder.selectedFile.getTextProperty("filename")}
              />
              <ErrorBoundary>
                <FileTabs {...props} />
              </ErrorBoundary>
            </>
          )}
        </div>
      </SplitPane>
    </div>
  );
});

const FileTabs: React.FunctionComponent<
  IProps & React.HTMLAttributes<HTMLDivElement>
> = observer((props) => {
  useLingui();
  const [tabIndex, setTabIndex] = React.useState(
    userSettingsSingleton.DeveloperMode ? 0 : 0
  );

  const [selectedContribution, setSelectedContribution] =
    React.useState<Contribution | undefined>(undefined);

  // search context (for highlighting the Notes tab label when a match is inside notes)
  const { searchTerm } = React.useContext(SearchContext);

  // Host handler for a plugin's `selectFile` API. The plugin passes a bare file name that
  // already exists in this folder (e.g. an `.eaf` it just wrote via companions); we register
  // it in the folder's file list if needed and make it the selected file, which re-drives
  // this observer and the plugin tabs (SayMore's "Start Annotating" -> "Segments" flow).
  const handlePluginSelectFile = React.useCallback(
    async (relPath: string): Promise<boolean> => {
      const folder = props.folder;
      const abs = Path.join(folder.directory, relPath);
      const target = folder.registerExistingFile(abs);
      if (!target) return false;
      runInAction(() => {
        if (folder.selectedFile && folder.selectedFile !== target)
          folder.selectedFile.save();
        folder.selectedFile = target;
      });
      return true;
    },
    [props.folder]
  );

  // Plugin tabs come from tab PROVIDERS: on every selection change the host asks each plugin's
  // hidden provider which tabs to show for the selected file (uncached — the answer may change as
  // the file's companions come and go). This is async, so we hold the result in state and re-query
  // whenever the selected file, or the set/reload-counter of provider plugins, changes.
  const selectedFileForTabs = props.folder.selectedFile;
  const selectedPathForTabs = selectedFileForTabs
    ? selectedFileForTabs.getActualFilePath()
    : "";
  const providerSignal = pluginManager.plugins
    .filter((p) => p.enabled && p.manifest?.tabProvider)
    .map((p) => `${p.id}:${p.reloadCounter}`)
    .join(",");
  const [providerTabs, setProviderTabs] = React.useState<MatchedProviderTab[]>(
    []
  );
  React.useEffect(() => {
    const f = props.folder.selectedFile;
    const p = f ? f.getActualFilePath() : "";
    if (!f || !p) {
      setProviderTabs([]);
      return;
    }
    const name = f.getTextProperty("filename");
    const extNoDot2 = Path.extname(p).replace(/^\./, "").toLowerCase();
    const fileCtx = {
      name,
      extension: extNoDot2,
      mimeType: getMimeType(extNoDot2),
      lametaType: f.type,
      path: p,
      uri: URL.pathToFileURL(p).toString()
    };
    let cancelled = false;
    tabProviderHost
      .getTabsForFile(fileCtx, {
        type: props.folder.folderType,
        directory: props.folder.directory
      })
      .then((tabs) => {
        if (!cancelled) setProviderTabs(tabs);
      })
      .catch(() => {
        if (!cancelled) setProviderTabs([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedPathForTabs,
    providerSignal,
    props.folder.folderType,
    props.folder.directory
  ]);

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
  const notesField = file.properties.getTextField("notes");
  const filename = file.getTextProperty("filename");

  const notesPanel = directoryObject.properties.getValue("notes") ? (
    <TabPanel>
      {/* <Notes text={directoryObject.properties.getTextField("notes")} /> */}
      <Notes field={notesField} />
    </TabPanel>
  ) : null;
  const propertiesPanel = (
    <TabPanel>
      <PropertyPanel file={file} authorityLists={props.authorityLists} />
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
  const imdiTab = userSettings.ShowIMDI ? (
    <Tab>IMDI {/* don't translate  */}</Tab>
  ) : (
    <></>
  );
  const paradisecTab = GetOtherConfigurationSettings().archiveUsesParadisec ? (
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

  const imdiPanel = userSettings.ShowIMDI ? (
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
  const paradisecPanel = GetOtherConfigurationSettings()
    .archiveUsesParadisec ? (
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
          <RoCrateView
            folder={props.folder}
            project={props.project}
            doValidate={props.folder instanceof Session}
          />
        </ErrorBoundary>
      </TabPanel>
    ) : (
      <></>
    );

  const standardMetaTabs = props.showStandardMetaTabs ? (
    <>
      <HighlightableTab
        getSearchStrings={() =>
          file.properties
            .values()
            .filter((f: any) => f && f.key !== "notes")
            .map((f: any) => f.text || "")
        }
        testId="properties-tab-highlight"
      >
        <Trans>Properties</Trans>
      </HighlightableTab>
      <HighlightableTab
        getSearchStrings={() =>
          (file.contributions || []).flatMap((c) => [
            c.personReference,
            c.role,
            c.comments
          ])
        }
        testId="contributors-tab-highlight"
      >
        <Trans>Contributors</Trans>
      </HighlightableTab>
      <HighlightableTab
        getSearchStrings={() => [notesField?.text]}
        testId="notes-tab-highlight"
      >
        <Trans>Notes</Trans>
      </HighlightableTab>
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

  // Check if we're in a project documents folder (Description Documents or Other Documents)
  const isProjectDocuments =
    props.folder.folderType === "project documents" ||
    props.folderTypeStyleClass === "project-documents";

  // For project documents, always show Access tab/panel so metadata stays editable
  const showDocumentAccess = isProjectDocuments;

  const projectDocsTabs = showDocumentAccess ? (
    <>
      <Tab data-testid="access-tab">
        <Trans>Access</Trans>: {file.getTextProperty("access") || "?"}
      </Tab>
    </>
  ) : null;

  const projectDocsPanels = showDocumentAccess ? (
    <>
      <TabPanel>
        <div className="document-access-panel">
          <AccessChooser
            field={file.properties.getTextField("access")}
            authorityLists={props.authorityLists}
          />
          {file.properties.getHasValue("accessDescription") && (
            <TextFieldEdit
              className="accessDescription"
              field={file.properties.getTextField("accessDescription")}
            />
          )}
        </div>
      </TabPanel>
    </>
  ) : null;

  // by preventing re-use of the Tabs element, it causes us to reset to the first tab when the file
  // changes. It also includes the provider-tab signature so that when async provider tabs arrive
  // (or change), the <Tabs> remounts and re-applies defaultIndex (e.g. a claimDefault "Segments").
  const tabsKey =
    props.folder.selectedFile!.getTextProperty("filename") +
    "|" +
    providerTabs.map((m) => `${m.pluginId}/${m.tab.id}`).join(",");

  let t = file.type;
  const ext = Path.extname(file.getActualFilePath()).toLowerCase();
  if ([".txt", ".md"].includes(ext)) t = "Text";
  if (ext === ".pdf") t = "PDF";

  // --- File-handler plugins -------------------------------------------------
  // Plugins may contribute tabs for regular content files. We skip the registry entirely for
  // the Session/Person metadata views (they have their own dedicated cases below). Reading the
  // observable plugin registry here makes this observer re-render on enable/disable and on the
  // dev watcher's reloadCounter bump (which hot-reloads an open plugin tab).
  const extNoDot = ext.replace(/^\./, "");
  const mimeType = getMimeType(extNoDot);
  // Plugin tabs come from tab providers (queried asynchronously above into `providerTabs`).
  // Metadata views (Session/Person) never show plugin tabs.
  const matchedPluginTabs =
    t === "Session" || t === "Person" ? [] : providerTabs;
  // The built-in viewer is tab 0; plugin tabs occupy 1..N; then the standard metadata tabs.
  const fileTabsDefaultIndex = computeDefaultIndex(matchedPluginTabs);

  const pluginTabs = matchedPluginTabs.map((m) => (
    <PluginTab
      key={`${m.pluginId}/${m.tab.id}`}
      label={localizeLabel(m.tab.label, currentUILanguage)}
    />
  ));

  const pluginPanels = matchedPluginTabs.map((m) => {
    const record = pluginManager.getById(m.pluginId);
    return (
      <TabPanel key={`${m.pluginId}/${m.tab.id}`}>
        <ErrorBoundary>
          <PluginTabPanel
            pluginId={m.pluginId}
            pluginVersion={m.pluginVersion}
            pluginName={record?.manifest?.name || m.pluginId}
            pluginLabel={
              record?.manifest?.label
                ? localizeLabel(record.manifest.label, currentUILanguage)
                : undefined
            }
            pluginInfoUrl={record?.manifest?.infoUrl}
            pluginDir={record?.directory || ""}
            entry={m.entry}
            tabId={m.tab.id}
            apiVersion={record?.manifest?.apiVersion ?? 1}
            permissions={m.permissions}
            reloadCounter={record?.reloadCounter ?? 0}
            filePath={path}
            fileName={filename}
            fileExtension={extNoDot}
            fileMimeType={mimeType}
            fileLametaType={file.type}
            fileUri={URL.pathToFileURL(path).toString()}
            folderType={props.folder.folderType}
            folderDirectory={props.folder.directory}
            languageCode={currentUILanguage}
            appVersion={pkg.version}
            onSelectFile={handlePluginSelectFile}
          />
        </ErrorBoundary>
      </TabPanel>
    );
  });

  // Shared skeleton for the generic (non-Session/Person) file types. The 7 built-in file
  // cases differ only in their single viewer tab + panel; everything else (plugin tabs,
  // standard metadata tabs, project-documents Access tab) is identical, so they funnel here.
  const renderFileTabs = (
    viewerTab: JSX.Element,
    viewerPanel: JSX.Element
  ) => (
    <Tabs key={tabsKey} defaultIndex={fileTabsDefaultIndex}>
      {/* 90%-opaque tab labels (see .fileTabsList in FolderPane.css). The dimming lives in a
          plain stylesheet class, NOT an emotion `css` prop: putting `css` on <TabList> wraps
          it in an Emotion component, so react-tabs no longer recognizes it as a TabList and
          never marks the selected tab (no white "connected" box, no break in the strip line).
          We add "react-tabs__tab-list" because react-tabs replaces its default class when we
          pass a className. */}
      <TabList className="react-tabs__tab-list fileTabsList">
        {viewerTab}
        {pluginTabs}
        {standardMetaTabs}
        {projectDocsTabs}
      </TabList>
      {viewerPanel}
      {pluginPanels}
      {standardMetaPanels}
      {projectDocsPanels}
    </Tabs>
  );

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
            <HighlightableTab
              getSearchStrings={() =>
                directoryObject.properties
                  .values()
                  .filter(
                    (f: any) => f && f.key !== "notes" && f.key !== "status"
                  )
                  .map((f: any) => f.text || "")
              }
              testId="session-tab-highlight"
            >
              <Trans>Session</Trans>
            </HighlightableTab>
            <HighlightableTab
              getSearchStrings={() =>
                (file.contributions || []).flatMap((c) => [
                  c.personReference,
                  c.role,
                  c.comments
                ])
              }
              testId="contributors-tab-highlight"
            >
              <Trans>Contributors</Trans>
            </HighlightableTab>
            <HighlightableTab
              getSearchStrings={() => [
                (directoryObject as any).properties.getTextField("status")?.text
              ]}
              testId="status-tab-highlight"
            >
              <Trans>Status</Trans>
            </HighlightableTab>
            <HighlightableTab
              getSearchStrings={() => [notesField?.text]}
              testId="notes-tab-highlight"
            >
              <Trans>Notes</Trans>
            </HighlightableTab>
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
                formClass={getSessionFormClass()}
                authorityLists={props.authorityLists}
                languageFinder={props.project.languageFinder}
                //customFieldNames={props.customFieldNames}
                fieldThatControlsFileNames={"id"}
                fieldThatControlsFileNamesMightHaveChanged={(key) =>
                  (props.folder as Session).nameMightHaveChanged()
                }
                validateFieldThatControlsFileNames={(value) =>
                  props.project.getValidationMessageForSessionId(
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
      const kFirstPersonTabToOpen = userSettingsSingleton.DeveloperMode ? 0 : 0;
      return (
        <Tabs key={tabsKey} defaultIndex={kFirstPersonTabToOpen}>
          <TabList>
            <HighlightableTab
              getSearchStrings={() =>
                directoryObject.properties
                  .values()
                  .filter((f: any) => f && f.key !== "notes")
                  .map((f: any) => f.text || "")
              }
              testId="person-tab-highlight"
            >
              <Trans>Person</Trans>
            </HighlightableTab>
            <HighlightableTab
              getSearchStrings={() =>
                props.project
                  .getContributionsMatchingPerson(
                    (directoryObject as any).getIdToUseForReferences()
                  )
                  .flatMap((c: any) => [c.sessionName, c.role, c.comments])
              }
              testId="person-contributions-tab-highlight"
            >
              <Trans>Contributions</Trans>
            </HighlightableTab>
            <HighlightableTab
              getSearchStrings={() => [notesField?.text]}
              testId="notes-tab-highlight"
            >
              <Trans>Notes</Trans>
            </HighlightableTab>
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
                  return props.project.getValidationMessageForPersonFullName(
                    directoryObject as Person,
                    value
                  );
                }}
                validateCode={(value) =>
                  props.project.getValidationMessageForPersonCode(
                    directoryObject as Person,
                    value
                  )
                }
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
      return renderFileTabs(
        <Tab>
          <Trans>Audio</Trans>
        </Tab>,
        <TabPanel>
          <audio controls>
            <source src={`file://${path}`} />
          </audio>
        </TabPanel>
      );
    case "Video":
      return renderFileTabs(
        <Tab>
          <Trans>Video</Trans>
        </Tab>,
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
      );
    case "Image":
      const isTiff = [".tif", ".tiff"].includes(ext.toLowerCase());
      return renderFileTabs(
        <Tab>
          <Trans>Image</Trans>
        </Tab>,
        <TabPanel>
          {isTiff ? (
            <TiffViewer path={path} className="imageViewer" />
          ) : (
            <img
              className="imageViewer"
              // file:// is required on mac
              src={`file:///${path.replace(/#/g, "%23")}`}
            />
          )}
        </TabPanel>
      );
    case "Text":
      return renderFileTabs(
        <Tab>
          <Trans>Text</Trans>
        </Tab>,
        <TabPanel>
          {/* NB: not a url, just a file here path */}
          <TextFileView path={path} />
        </TabPanel>
      );
    case "PDF":
      return renderFileTabs(
        <Tab>PDF</Tab>,
        <TabPanel>
          <object
            data={`file:///${path.replace(
              /#/g,
              "%23"
            )}#toolbar=0&navpanes=0&scrollbar=1`}
            type="application/pdf"
            css={css`
              width: 100%;
              height: 100%;
              min-height: 400px;
            `}
          >
            <p>
              Unable to display PDF.{" "}
              <a
                href=""
                onClick={(e) => {
                  e.preventDefault();
                  electron.shell.openPath(file.getActualFilePath());
                }}
              >
                Open externally
              </a>
            </p>
          </object>
        </TabPanel>
      );
    case "ELAN":
      return renderFileTabs(
        <Tab>
          <>ELAN {/* should not be translated */}</>
        </Tab>,
        // NB: must keep the react-tabs__tab-panel class; passing only "unhandledFileType"
        // replaces it, so the panel loses its display:none and leaks (visible + its 2em
        // top margin) whenever another tab — e.g. a plugin tab — is selected.
        <TabPanel className="react-tabs__tab-panel unhandledFileType">
          <a
            onClick={() => {
              // the "file://" prefix is required on mac, works fine on windows
              electron.shell.openExternal("file://" + file.getActualFilePath());
            }}
          >
            <Trans>Open in ELAN</Trans>
          </a>
        </TabPanel>
      );
    default:
      return renderFileTabs(
        <Tab>
          <Trans>File</Trans>
        </Tab>,
        // keep react-tabs__tab-panel (see the ELAN case) so this viewer panel hides when a
        // different tab is selected instead of leaking its content + top margin.
        <TabPanel className="react-tabs__tab-panel unhandledFileType">
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
      );
  }
});
