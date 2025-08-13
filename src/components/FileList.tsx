import * as React from "react";
import { default as ReactTable, RowInfo } from "react-table-6";
import { Folder } from "../model/Folder/Folder";
import { File } from "../model/file/File";
import Dropzone from "react-dropzone";
import { OpenDialogOptions, ipcRenderer } from "electron";
import * as remote from "@electron/remote";
import "./FileList.css";
import { revealInFolder } from "../other/crossPlatformUtilities";
import { ShowRenameDialog } from "./RenameFileDialog/RenameFileDialog";
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
  getStatusOfFile
} from "../model/file/FileStatus";
import { useLingui } from "@lingui/react";
import { SearchContext } from "./SearchContext";
import { css } from "@emotion/react";
import HighlightSearchTerm from "./HighlightSearchTerm";
import { lameta_orange } from "../containers/theme";
import SearchIcon from "@mui/icons-material/Search";
const electron = require("electron");

export const _FileList: React.FunctionComponent<{
  folder: Folder;
  extraButtons?: object[];
}> = (props) => {
  React.useEffect(() => {
    if (process.env.E2E) {
      try {
        (window as any).lametaDebugCurrentFolder = props.folder;
      } catch {}
    }
  }, [props.folder, props.folder?.files?.length]);
  useLingui();
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

  const { searchTerm } = React.useContext(SearchContext);
  const highlight = (text: string) => <HighlightSearchTerm text={text} />;

  const fileHasMetadataMatch = (file: any, trimmed: string): boolean => {
    if (!trimmed || !file) return false;
    let metadataMatch = false;
    try {
      if (file.properties && file.properties.values) {
        for (const p of file.properties.values()) {
          if (
            p &&
            typeof p.text === "string" &&
            p.text.length > 0 &&
            p.text.toLowerCase().includes(trimmed)
          ) {
            metadataMatch = true;
            break;
          }
        }
      }
      if (!metadataMatch && Array.isArray(file.contributions)) {
        for (const c of file.contributions) {
          if (
            (c.personReference &&
              c.personReference.toLowerCase().includes(trimmed)) ||
            (c.role && c.role.toLowerCase().includes(trimmed)) ||
            (c.comments && c.comments.toLowerCase().includes(trimmed))
          ) {
            metadataMatch = true;
            break;
          }
        }
      }
    } catch {}
    return metadataMatch;
  };

  let columns: any[] = [
    {
      id: "icon",
      Header: "",
      width: 30,
      accessor: (d: any) => {
        const f: File = d;
        return f.getIconPath();
      },
      Cell: (p) => <img src={p.value} />
    },
    {
      id: "name",
      Header: t`Name`,
      accessor: (d: any) => {
        const f: File = d;
        return f.getFilenameToShowInList();
      },
      className: "filename",
      Cell: (cell: any) => highlight(cell.value)
    },
    {
      id: "linkStatus",
      Header: "",
      width: 30,
      accessor: (d: any) => {
        const f: File = d;
        return getLinkStatusIconPath(f);
      },
      Cell: (p) => (p.value ? <img src={p.value} /> : null)
    },
    {
      id: "type",
      Header: t`Type`,
      width: 72,
      accessor: (d: any) => {
        const f: File = d;
        return translateFileType(f.getTextProperty("type", ""));
      }
    },
    {
      id: "modifiedDate",
      Header: t`Modified`,
      accessor: (d: any) => {
        const f: File = d;

        const dt: Date | undefined = f.getModifiedDate(); // already local time
        // convert the date to YYYY/MM/DD HH:MM
        let dateDisplay = "";
        if (dt)
          dateDisplay =
            dt.getFullYear() +
            "/" +
            (dt.getMonth() + 1) +
            "/" +
            dt.getDate() +
            " " +
            dt.getHours() +
            ":" +
            dt.getMinutes();

        return f.copyInProgress ? f.copyProgress : dateDisplay;
      }
    },
    {
      id: "size",
      Header: t`Size`,
      width: 75,
      style: { textAlign: "right" },
      accessor: (d: any) => {
        const f: File = d;
        return f.getTextProperty("size", "");
      }
    }
  ];

  if (searchTerm) {
    columns = [
      {
        id: "matchIndicator",
        Header: "",
        width: 20,
        accessor: (d: any) => d,
        style: { padding: 0 },
        Cell: (cell: any) => {
          const match = fileHasMetadataMatch(cell.original, searchTerm);
          return match ? (
            <div
              css={css`
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
                height: 100%;
              `}
            >
              <div
                css={css`
                  background: ${lameta_orange};
                  border-radius: 50%;
                  width: 18px;
                  height: 18px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  /* keep icon crisp */
                  line-height: 0;
                `}
              >
                <SearchIcon
                  fontSize="inherit"
                  css={css`
                    color: white;
                    font-size: 14px; /* slightly smaller to fit circle */
                  `}
                />
              </div>
            </div>
          ) : null;
        }
      },
      ...columns
    ];
  }
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
          accepted.map((f) => (f as any).path)
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
          onClick={async () => await showAddFilesDialog(props.folder)}
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
          const metadataMatch = fileHasMetadataMatch(
            rowInfo.original,
            searchTerm
          );

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
                : "") +
              (metadataMatch ? " metadataMatch " : ""),
            "data-testid": metadataMatch ? "file-metadata-match" : undefined,
            style: undefined
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
        revealInFolder(file.getActualFilePath());
      },
      enabled: !missing
    },
    {
      label: t`Open in program associated with this file type`,
      click: () => {
        // the "file://" prefix is required on mac, works fine on windows
        electron.shell.openPath("file://" + file.getActualFilePath());
      },
      enabled: !missing,
      visible: !isSpecialSayMoreFile || showDevOnlyItems
    },
    {
      label: t`Rename...`,
      click: () => {
        ShowRenameDialog(file, folder);
      },
      enabled: !missing,
      visible: contextMenu && !isSpecialSayMoreFile
    },
    { type: "separator", visible: !contextMenu },
    {
      label: file.isLinkFile() ? t`Delete link to file...` : t`Delete File...`,
      enabled: file.canDelete,
      click: () => {
        folder.MoveFileToTrashWithUI(file);
      },
      visible: contextMenu
    },
    {
      type: "separator",
      visible: contextMenu && showDevOnlyItems
    },
    {
      label: "Inspect element",
      click() {
        (mainWindow as any).inspectElement(x, y);
      },
      visible: contextMenu && showDevOnlyItems
    }
  ];

  items = items.filter((item) => item.visible !== false);

  remote.Menu.buildFromTemplate(items as any).popup({ window: mainWindow });
}

async function showAddFilesDialog(folder: Folder) {
  const options: OpenDialogOptions = {
    properties: ["openFile", "multiSelections"]
  };
  const result = await ipcRenderer.invoke("showOpenDialog", options);
  if (result && result.filePaths && result.filePaths.length > 0) {
    await addFiles(folder, result.filePaths);
  }
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
