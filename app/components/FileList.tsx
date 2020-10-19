import * as React from "react";
import { default as ReactTable, RowInfo } from "react-table";
import { Folder } from "../model/Folder/Folder";
import { File } from "../model/file/File";
import Dropzone, { ImageFile } from "react-dropzone";
import { remote, OpenDialogOptions, ipcRenderer } from "electron";
import "./FileList.scss";
import { showInExplorer } from "../other/crossPlatformUtilities";
import RenameFileDialog from "./RenameFileDialog/RenameFileDialog";
import { i18n, translateFileType } from "../other/localization";
import { t } from "@lingui/macro";
import { Trans } from "@lingui/react";
import scrollSelectedIntoView from "./FixReactTableScroll";
import { isNullOrUndefined } from "util";
import userSettings from "../other/UserSettings";
import { observer } from "mobx-react-lite";
import { NotifyError, NotifyWarning } from "./Notify";
import * as fs from "fs-extra";
const electron = require("electron");

export const FileList = observer<{ folder: Folder; extraButtons?: object[] }>(
  (props) => {
    const [selectedFile, setSelectedFile] = React.useState(undefined);

    // What this mobxDummy is about:
    // What happens inside the component tabeles cells are invisible to mobx; it doesn't
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
          return f.getIconName();
        },
        Cell: (p) => <img src={p.value} />,
      },
      {
        id: "name",
        Header: i18n._(t`Name`),
        accessor: (d: any) => {
          const f: File = d;
          return f.getTextProperty("filename");
        },
      },
      {
        id: "type",
        Header: i18n._(t`Type`),
        width: 72,
        accessor: (d: any) => {
          const f: File = d;
          return translateFileType(f.getTextProperty("type", ""));
        },
      },
      {
        id: "modifiedDate",
        Header: i18n._(t`Modified`),
        accessor: (d: any) => {
          const f: File = d;

          return f.copyInProgress
            ? f.copyProgress
            : d.properties.getValueOrThrow("modifiedDate").asISODateString();
        },
      },
      {
        id: "size",
        Header: i18n._(t`Size`),
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
          if (
            accepted.some((f) => ["session", "person", "meta"].includes(f.type))
          ) {
            NotifyWarning(`You cannot add files of that type`);
            return;
          }
          if (accepted.some((f) => fs.lstatSync(f.path).isDirectory())) {
            NotifyWarning(`You cannot add folders.`);
            return;
          }
          props.folder.copyInFiles(
            accepted
              .filter((f) => {
                return f.type !== "session";
              })
              .map((f) => f.path)
          );
        }}
        disableClick
      >
        <div className={"mask onlyIfInDropZone"}>Drop files here</div>
        <div className={"fileBar"}>
          <button
            disabled={
              isNullOrUndefined(props.folder.selectedFile) ||
              isSpecialSayMoreFile
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
              RenameFileDialog.show(props.folder.selectedFile!, props.folder)
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
            onClick={() => addFiles(props.folder)}
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
            return {
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
                (rowInfo.original.copyPending ? "copyPending " : "") +
                (rowInfo && rowInfo.original === props.folder.selectedFile
                  ? "selected"
                  : ""),
            };
          }}
        />
      </Dropzone>
    );
  }
);

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

  let items = [
    {
      label:
        process.platform === "darwin"
          ? i18n._(t`Show in Finder`)
          : i18n._(t`Show in File Explorer`),
      click: () => {
        showInExplorer(file.describedFilePath);
      },
    },
    {
      label: i18n._(t`Open in program associated with this file type`),
      click: () => {
        // the "file://" prefix is required on mac, works fine on windows
        electron.shell.openExternal("file://" + file.describedFilePath);
      },
      visible: !isSpecialSayMoreFile || showDevOnlyItems,
    },
    {
      label: i18n._(t`Rename...`),
      click: () => {
        RenameFileDialog.show(file, folder);
      },
      visible: contextMenu && !isSpecialSayMoreFile,
    },
    { type: "separator", visible: !contextMenu },
    {
      label: i18n._(t`Delete File...`),
      enabled: file.canDelete,
      click: () => {
        folder.moveFileToTrash(file);
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

function addFiles(folder: Folder) {
  const options: OpenDialogOptions = {
    properties: ["openFile", "multiSelections"],
  };
  ipcRenderer.invoke("showOpenDialog", options).then((result) => {
    if (result && result.filePaths && result.filePaths.length > 0) {
      //folder.addFiles(result.filePaths.map((p) => ({ path: p })));
      folder.copyInFiles(result.filePaths);
    }
  });
}
