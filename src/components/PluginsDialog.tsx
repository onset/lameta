import { css } from "@emotion/react";
import * as React from "react";
import { useState } from "react";
import { observer } from "mobx-react";
import { i18n } from "@lingui/core";
import { t, Trans } from "@lingui/macro";
import { ipcRenderer, OpenDialogOptions } from "electron";
import Path from "path";
import fs from "fs-extra";
import extract from "extract-zip";
import { app } from "@electron/remote";
import pluginManager, { PluginRecord } from "../plugins/PluginManager";
import { parsePluginManifest } from "../plugins/PluginManifest";
import { revealInFolder, asyncTrash } from "../other/crossPlatformUtilities";
import { NotifyError, NotifyWarning } from "./Notify";
import { lameta_dark_green } from "../containers/theme";
import userSettings from "../other/UserSettings";
import { getTestEnvironment } from "../getTestEnvironment";
import {
  DialogBottomButtons,
  DialogButton,
  DialogBottomLeftButtons,
  DialogMiddle,
  DialogTitle,
  LametaDialog
} from "./LametaDialog";

let staticShowPluginsDialog: () => void = () => {};
export { staticShowPluginsDialog as ShowPluginsDialog };

const MANIFEST_FILENAMES = ["plugin.json5", "plugin.json"];

// Find the folder inside an extracted zip that actually contains the manifest. We accept the
// manifest at the zip root or exactly one level deep.
function findPluginFolderInExtract(root: string): string | undefined {
  for (const name of MANIFEST_FILENAMES) {
    if (fs.existsSync(Path.join(root, name))) return root;
  }
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const sub = Path.join(root, entry.name);
    for (const name of MANIFEST_FILENAMES) {
      if (fs.existsSync(Path.join(sub, name))) return sub;
    }
  }
  return undefined;
}

function readManifestText(folder: string): string | undefined {
  for (const name of MANIFEST_FILENAMES) {
    const p = Path.join(folder, name);
    if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
  }
  return undefined;
}

async function installPluginFromZip(zipPath: string): Promise<void> {
  const tempRoot = Path.join(
    app.getPath("userData"),
    "plugins-install-tmp",
    Path.basename(zipPath, Path.extname(zipPath)) + "-" + process.pid
  );
  try {
    await fs.remove(tempRoot);
    await fs.ensureDir(tempRoot);
    await extract(zipPath, { dir: tempRoot });

    const pluginFolder = findPluginFolderInExtract(tempRoot);
    if (!pluginFolder) {
      NotifyError(
        i18n._(
          t`That zip does not contain a plugin.json5 at its root or one level deep.`
        )
      );
      return;
    }

    const manifestText = readManifestText(pluginFolder)!;
    const result = parsePluginManifest(manifestText);
    if (result.errors) {
      NotifyError(
        i18n._(t`The plugin's manifest has problems:`) +
          "\n" +
          result.errors.join("\n")
      );
      return;
    }

    const id = result.manifest!.id;
    const target = Path.join(app.getPath("userData"), "plugins", id);

    if (fs.existsSync(target)) {
      const choice = await ipcRenderer.invoke("showMessageBox", {
        type: "question",
        message: i18n._(
          t`A plugin with id "${id}" is already installed. Replace it?`
        ),
        buttons: [i18n._(t`Replace`), i18n._(t`Cancel`)],
        cancelId: 1,
        defaultId: 0
      });
      if (choice !== 0) return;
      await fs.remove(target);
    }

    await fs.ensureDir(Path.dirname(target));
    await fs.move(pluginFolder, target, { overwrite: true });
    pluginManager.reload();
  } catch (e: any) {
    NotifyError(
      i18n._(t`Could not install the plugin.`) + " " + (e?.message || e)
    );
  } finally {
    await fs.remove(tempRoot).catch(() => {});
  }
}

const PluginRow: React.FunctionComponent<{ record: PluginRecord }> = observer(
  ({ record }) => {
    const name = record.manifest?.name || record.id;
    const version = record.manifest?.version || "";
    const description = record.manifest?.description || "";

    return (
      <tr>
        <td>
          <input
            type="checkbox"
            checked={record.enabled}
            disabled={!!record.errors}
            onChange={(e) =>
              pluginManager.setEnabled(record.id, e.target.checked)
            }
            aria-label={`enable ${record.id}`}
          />
        </td>
        <td>
          <div css={css`font-weight: 600;`}>{name}</div>
          <div css={css`font-size: 0.85em; color: #6b6b6b;`}>{record.id}</div>
          {record.errors && (
            <div css={css`color: #dc322f; font-size: 0.85em;`}>
              {record.errors.join("; ")}
            </div>
          )}
        </td>
        <td>{version}</td>
        <td css={css`max-width: 260px;`}>{description}</td>
        <td>{record.source}</td>
        <td>
          {record.source === "user" && (
            <a
              css={css`color: ${lameta_dark_green}; cursor: pointer;`}
              onClick={async () => {
                const choice = await ipcRenderer.invoke("showMessageBox", {
                  type: "question",
                  message: i18n._(t`Uninstall "${name}"?`),
                  buttons: [i18n._(t`Uninstall`), i18n._(t`Cancel`)],
                  cancelId: 1,
                  defaultId: 0
                });
                if (choice !== 0) return;
                const r = await asyncTrash(record.directory);
                if (!r.succeeded) {
                  NotifyWarning(
                    i18n._(t`lameta could not remove the plugin folder.`)
                  );
                }
                pluginManager.reload();
              }}
            >
              <Trans>Uninstall</Trans>
            </a>
          )}
        </td>
      </tr>
    );
  }
);

export const PluginsDialog: React.FunctionComponent<{}> = observer(() => {
  const [open, setOpen] = useState(false);
  const [devPath, setDevPath] = useState<string>("");

  staticShowPluginsDialog = () => {
    pluginManager.reload();
    setDevPath(pluginManager.developerPluginPath || "");
    setOpen(true);
  };

  const plugins = pluginManager.plugins;

  return (
    <LametaDialog
      requestClose={() => setOpen(false)}
      open={open}
      data-testid="plugins-dialog"
    >
      <DialogTitle title={i18n._(t`Plugins`)}></DialogTitle>
      <DialogMiddle>
        {plugins.length === 0 ? (
          <p>
            <Trans>No plugins are installed yet.</Trans>
          </p>
        ) : (
          <table
            css={css`
              width: 100%;
              border-collapse: collapse;
              td,
              th {
                text-align: left;
                padding: 6px 8px;
                border-bottom: 1px solid #eee;
                vertical-align: top;
              }
            `}
          >
            <thead>
              <tr>
                <th></th>
                <th>
                  <Trans>Name</Trans>
                </th>
                <th>
                  <Trans>Version</Trans>
                </th>
                <th>
                  <Trans>Description</Trans>
                </th>
                <th>
                  <Trans>Source</Trans>
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {plugins.map((record) => (
                <PluginRow key={record.id} record={record} />
              ))}
            </tbody>
          </table>
        )}

        {(userSettings.DeveloperMode || getTestEnvironment().E2E) && (
          <div
            css={css`
              margin-top: 20px;
              padding-top: 12px;
              border-top: 1px solid #ddd;
            `}
          >
            <h4 css={css`margin-bottom: 4px;`}>
              <Trans>Developer plugin folder</Trans>
            </h4>
            <p css={css`font-size: 0.85em; color: #6b6b6b; margin-top: 0;`}>
              <Trans>
                Point this at a plugin folder you are developing. lameta watches
                it and reloads the open tab whenever you save a change.
              </Trans>
            </p>
            <div
              css={css`
                display: flex;
                flex-direction: row;
                align-items: center;
                gap: 12px;
              `}
            >
              <div css={css`overflow-wrap: anywhere; flex: 1;`}>
                {devPath || i18n._(t`(not set)`)}
              </div>
              <button
                onClick={() => {
                  const options: OpenDialogOptions = {
                    properties: ["openDirectory"]
                  };
                  ipcRenderer
                    .invoke("showOpenDialog", options)
                    .then((r) => {
                      if (r && r.filePaths && r.filePaths.length > 0) {
                        pluginManager.setDeveloperPluginPath(r.filePaths[0]);
                        setDevPath(r.filePaths[0]);
                      }
                    });
                }}
              >
                <Trans>Change...</Trans>
              </button>
              {devPath && (
                <a
                  css={css`color: ${lameta_dark_green}; cursor: pointer;`}
                  onClick={() => {
                    pluginManager.setDeveloperPluginPath("");
                    setDevPath("");
                  }}
                >
                  <Trans>Clear</Trans>
                </a>
              )}
            </div>
          </div>
        )}
      </DialogMiddle>

      <DialogBottomButtons>
        <DialogBottomLeftButtons>
          <DialogButton
            onClick={() => {
              const options: OpenDialogOptions = {
                properties: ["openFile"],
                filters: [
                  { name: "lameta plugin", extensions: ["lmplug"] },
                  { name: "Zip", extensions: ["zip"] }
                ]
              };
              ipcRenderer.invoke("showOpenDialog", options).then((r) => {
                if (r && r.filePaths && r.filePaths.length > 0) {
                  installPluginFromZip(r.filePaths[0]);
                }
              });
            }}
          >
            <Trans>Install plugin…</Trans>
          </DialogButton>
          <DialogButton
            onClick={() => {
              const dir = pluginManager.userPluginsDir;
              fs.ensureDirSync(dir);
              revealInFolder(dir);
            }}
          >
            <Trans>Open plugins folder</Trans>
          </DialogButton>
          <DialogButton onClick={() => pluginManager.reload()}>
            <Trans>Reload plugins</Trans>
          </DialogButton>
        </DialogBottomLeftButtons>
        <DialogButton default={true} onClick={() => setOpen(false)}>
          <Trans>Close</Trans>
        </DialogButton>
      </DialogBottomButtons>
    </LametaDialog>
  );
});
