import * as React from "react";
import { default as ReactTable, RowInfo } from "react-table-6";
import { Folder } from "../model/Folder/Folder";
import { File } from "../model/file/File";
import Dropzone, { ImageFile } from "react-dropzone";
import { OpenDialogOptions, ipcRenderer } from "electron";
import * as remote from "@electron/remote";
import "./FileList.scss";
import { showInExplorer } from "../other/crossPlatformUtilities";
import {
  RenameFileDialog,
  ShowRenameDialog,
} from "./RenameFileDialog/RenameFileDialog";
import { i18n, translateFileType } from "../other/localization";
import { t, Trans } from "@lingui/macro";
import scrollSelectedIntoView from "./FixReactTableScroll";
import { isNullOrUndefined } from "util";
import userSettings from "../other/UserSettings";
import { observer } from "mobx-react";
import { NotifyWarning } from "./Notify";
import * as fs from "fs-extra";
import { getExtension } from "../other/CopyManager";
import { getMediaFolderOrEmptyForThisProjectAndMachine } from "../model/Project/MediaFolderAccess";
import {
  getLinkStatusIconPath,
  getStatusOfFile,
} from "../model/file/FileStatus";
import { toJS } from "mobx";
const electron = require("electron");

export const _FileList: React.FunctionComponent<{
  folder: Folder;
  extraButtons?: object[];
}> = (props) => {
  const [selectedFile, setSelectedFile] = React.useState(undefined);
  const [haveMediaFolder] = React.useState(
    getMediaFolderOrEmptyForThisProjectAndMachine()
  );
  // What this mobxDummy is about:
  // What happens inside the component tables cells are invisible to mobx; it doesn't
  // have a way of knowing that these are reliant on the filename of the file.
  // See https://mobx.js.org/best/react.html#mobx-only-tracks-data-accessed-for-observer-components-if-they-are-directly-accessed-by-render
  // However the <Observer> wrapper suggested by that link messes up the display of the table.
  // So for now, we just access every filename right here, while mobx is watching. That's enough to get it to trigger a re-render
  // when the user does something that causes a rename.
  const mobxDummy = props.folder.files.map((f) => {
    f.getTextProperty("filename");
    const unused = f.copyInProgress;
    const progressUnused = f.copyProgress;
  });

  const columns = [
    {
      id: "icon",
      Header: "",
      width: 30,
      accessor: (d: any) => {
        const f: File = d;
        return f.getIconPath();
      },
      Cell: (p) => <img src={p.value} />,
    },
    {
      id: "name",
      Header: t`Name`,
      accessor: (d: any) => {
        const f: File = d;
        return f.getFilenameToShowInList();
      },
      className: "filename",
    },
    {
      id: "linkStatus",
      Header: "",
      width: 30,
      accessor: (d: any) => {
        const f: File = d;
        return getLinkStatusIconPath(f);
      },
      Cell: (p) => <img src={p.value} />,
    },
    {
      id: "type",
      Header: t`Type`,
      width: 72,
      accessor: (d: any) => {
        const f: File = d;
        return translateFileType(f.getTextProperty("type", ""));
      },
    },
    {
      id: "modifiedDate",
      Header: t`Modified`,
      accessor: (d: any) => {
        const f: File = d;

        return f.copyInProgress
          ? f.copyProgress
          : d.properties.getValue("modifiedDate")?.asISODateString();
      },
    },
    {
      id: "size",
      Header: t`Size`,
      width: 75,
      style: { textAlign: "right" },
      accessor: (d: any) => {
        const f: File = d;
        return f.getTextProperty("size", "");
      },
    },
  ];
  const isSpecialSayMoreFile =
    props.folder.selectedFile === props.folder.metadataFile;
  const filesPerPage = Math.min(300, props.folder.files.length);

  return (
    <Dropzone
      activeClassName={"drop-active"}
      className={"fileList"}
      onDrop={(accepted, rejected) => {
        addFiles(
          props.folder,
          accepted.map((f) => f.path)
        );
      }}
      disableClick
    >
      <div className={"mask onlyIfInDropZone"}>Drop files here</div>
      <div className={"fileBar"}>
        <button
          disabled={
            isNullOrUndefined(props.folder.selectedFile) || isSpecialSayMoreFile
          }
          onClick={() => {
            showFileMenu(
              props.folder,
              props.folder.selectedFile!,
              false,
              isSpecialSayMoreFile
            );
          }}
        >
          <Trans>Open</Trans>
          {/* <ul className={"menu"}>
              <li className={"cmd-show-in-explorer"}>
                Show in File Explorer...
              </li>
            </ul> */}
        </button>
        <button
          className={"cmd-rename"}
          disabled={isSpecialSayMoreFile}
          onClick={() =>
            ShowRenameDialog(props.folder.selectedFile!, props.folder)
          }
        >
          <Trans>Rename...</Trans>
        </button>
        {props.extraButtons
          ? props.extraButtons.map((c) => (
              <button
                key={(c as any).label}
                disabled={!(c as any).enabled(props.folder.selectedFile)}
                onClick={() => (c as any).onClick(props.folder.selectedFile)}
              >
                {(c as any).label}
              </button>
            ))
          : null}
        <button
          className={"cmd-add-files"}
          onClick={() => showAddFilesDialog(props.folder)}
        >
          <Trans> Add Files</Trans>
        </button>
      </div>
      <ReactTable
        //cause us to reset scroll to top when we change folders
        key={props.folder.directory}
        className="fileList"
        showPagination={props.folder.files.length > filesPerPage}
        pageSize={filesPerPage}
        showPageSizeOptions={false}
        data={props.folder.files}
        columns={columns}
        onFetchData={() => scrollSelectedIntoView("fileList")}
        getTrProps={(state: any, rowInfo: any, column: any) => {
          //NB: "rowInfo.row" is a subset of things that are mentioned with an accessor. "original" is the original.
          const { missing, status, info } = getStatusOfFile(rowInfo.original);

          return {
            title: info,
            onContextMenu: (e: any) => {
              e.preventDefault();
              //First select the row
              props.folder.selectedFile = rowInfo.original;
              setSelectedFile(rowInfo.original); // trigger re-render so that the following style: takes effect
              //this event doesn't want to be accessed in the timeout, so store the coordinates
              const x = e.clientX;
              const y = e.clientY;
              // then after it is selected, show the context menu
              window.setTimeout(
                () =>
                  showFileMenu(
                    props.folder,
                    rowInfo.original,
                    true,
                    isSpecialSayMoreFile,
                    x,
                    y
                  ),
                0
              );
            },
            onClick: (e: any, x: any) => {
              const file = rowInfo.original as File;
              if (!file.copyInProgress) {
                if (props.folder.selectedFile != null) {
                  // will only save if it thinks it is dirty
                  props.folder.selectedFile.save();
                }
                props.folder.selectedFile = rowInfo.original;
                setSelectedFile(rowInfo.original); // trigger re-render so that the following style: takes effect
              }
            },
            className:
              (rowInfo.original.copyInProgress ? "copyPending " : "") +
              ((rowInfo.original as File).isLinkFile() ? "linkFile " : "") +
              status +
              " " +
              (rowInfo && rowInfo.original === props.folder.selectedFile
                ? " selected "
                : ""),
          };
        }}
      />
    </Dropzone>
  );
};

// this hackery is to get a named export while applying observer... there must be a better way!
const x = observer(_FileList);
export { x as FileList };

function showFileMenu(
  folder: Folder,
  file: File,
  contextMenu: boolean,
  isSpecialSayMoreFile: boolean,
  x: number = 0,
  y: number = 0
) {
  const mainWindow = remote.getCurrentWindow(); // as any;
  if (!file) {
    return;
  }
  const showDevOnlyItems = userSettings.DeveloperMode;
  const missing = getStatusOfFile(file).missing;

  let items = [
    {
      label:
        process.platform === "darwin"
          ? t`Show in Finder`
          : t`Show in File Explorer`,
      click: () => {
        showInExplorer(file.getActualFilePath());
      },
      enabled: !missing,
    },
    {
      label: t`Open in program associated with this file type`,
      click: () => {
        // the "file://" prefix is required on mac, works fine on windows
        electron.shell.openPath("file://" + file.getActualFilePath());
      },
      enabled: !missing,
      visible: !isSpecialSayMoreFile || showDevOnlyItems,
    },
    {
      label: t`Rename...`,
      click: () => {
        ShowRenameDialog(file, folder);
      },
      enabled: !missing,
      visible: contextMenu && !isSpecialSayMoreFile,
    },
    { type: "separator", visible: !contextMenu },
    {
      label: file.isLinkFile() ? t`Delete link to file...` : t`Delete File...`,
      enabled: file.canDelete,
      click: () => {
        folder.MoveFileToTrashWithUI(file);
      },
      visible: contextMenu,
    },
    {
      type: "separator",
      visible: contextMenu && showDevOnlyItems,
    },
    {
      label: "Inspect element",
      click() {
        (mainWindow as any).inspectElement(x, y);
      },
      visible: contextMenu && showDevOnlyItems,
    },
  ];

  items = items.filter((item) => item.visible !== false);

  remote.Menu.buildFromTemplate(items as any).popup({ window: mainWindow });
}

function showAddFilesDialog(folder: Folder) {
  const options: OpenDialogOptions = {
    properties: ["openFile", "multiSelections"],
  };
  ipcRenderer.invoke("showOpenDialog", options).then((result) => {
    if (result && result.filePaths && result.filePaths.length > 0) {
      addFiles(folder, result.filePaths);
    }
  });
}

function addFiles(folder: Folder, paths: string[]) {
  if (
    paths.some((path) =>
      ["session", "person", "meta"].includes(getExtension(path))
    )
  ) {
    NotifyWarning(t`You cannot add files of that type`);
    return;
  }
  if (paths.some((path) => fs.lstatSync(path).isDirectory())) {
    NotifyWarning(t`You cannot add folders.`);
    return;
  }
  folder.copyInFiles(paths);
}
