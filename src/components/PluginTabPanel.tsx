import React, { useEffect, useRef, useState } from "react";
import * as URL from "url";
import Path from "path";
import { css } from "@emotion/react";
import { Trans } from "@lingui/macro";
import { PluginHostBridge } from "../plugins/PluginHostBridge";
import pluginIcon from "@assets/plugin.svg";
import {
  LAMETA_PLUGIN_API_VERSIONS_SUPPORTED,
  PluginFolderType,
  PluginInitContext
} from "../plugins/PluginApiTypes";

export interface PluginTabPanelProps {
  pluginId: string;
  pluginVersion: string;
  /** Manifest `name`, shown in the pane's corner badge. */
  pluginName: string;
  /** Manifest `label` (already localized), preferred over `name` in the About link. */
  pluginLabel?: string;
  /** Manifest `info-url`; when present the corner badge becomes an "About <label>" link. */
  pluginInfoUrl?: string;
  pluginDir: string;
  entry: string;
  apiVersion: number;
  /** the plugin's granted manifest permissions, e.g. ["companionFiles"]. */
  permissions: string[];
  /** bumped by the dev watcher; changing it remounts the iframe (hot reload). */
  reloadCounter: number;

  // The selected file / owning folder, flattened to serializable primitives.
  filePath: string;
  fileName: string;
  fileExtension: string;
  fileMimeType: string;
  fileLametaType: string;
  fileUri: string;
  folderType: PluginFolderType;
  folderDirectory: string;

  languageCode: string;
  appVersion: string;

  /** Host handler for the `selectFile` plugin API: make `relPath` (a bare file name in the
   * owning folder) the selected file. Returns true if a file was selected. */
  onSelectFile?: (relPath: string) => Promise<boolean> | boolean;

  /** The provider-supplied tab id this content iframe is rendering (echoed as context.tab.id). */
  tabId?: string;
}

const HANDSHAKE_TIMEOUT_MS = 10000;

// The content of a plugin's tab: a plain <iframe> loading the plugin's own HTML, wired to a
// PluginHostBridge for the typed postMessage API. Mounts when its tab is selected (react-tabs
// lazily renders only the selected panel) and unmounts on file/tab change, so each iframe is
// bound to exactly one file for its lifetime.
export const PluginTabPanel: React.FunctionComponent<PluginTabPanelProps> = (
  props
) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<"connecting" | "ready" | "timeout">(
    "connecting"
  );
  // Local remount counter: combined with reloadCounter to force a fresh iframe on demand
  // (dev hot-reload, or the user clicking "Reload" after a handshake timeout).
  const [attempt, setAttempt] = useState(0);

  const apiSupported =
    LAMETA_PLUGIN_API_VERSIONS_SUPPORTED.includes(props.apiVersion);

  const iframeKey = `${props.pluginId}:${props.tabId ?? ""}:${props.reloadCounter}:${attempt}`;

  useEffect(() => {
    if (!apiSupported) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    setStatus("connecting");

    const context: PluginInitContext = {
      apiVersion: props.apiVersion,
      role: "tab",
      tab: props.tabId ? { id: props.tabId } : undefined,
      plugin: {
        id: props.pluginId,
        version: props.pluginVersion,
        grantedPermissions: props.permissions
      },
      file: {
        path: props.filePath,
        name: props.fileName,
        extension: props.fileExtension,
        mimeType: props.fileMimeType,
        lametaType: props.fileLametaType,
        uri: props.fileUri
      },
      folder: {
        type: props.folderType,
        directory: props.folderDirectory
      },
      ui: {
        languageCode: props.languageCode,
        appVersion: props.appVersion
      }
    };

    const bridge = new PluginHostBridge({
      iframe,
      context,
      filePath: props.filePath,
      fileName: props.fileName,
      folderDirectory: props.folderDirectory,
      pluginId: props.pluginId,
      permissions: props.permissions,
      onSelectFile: props.onSelectFile
    });

    // Watch for evidence the plugin is alive so we can clear the timeout / hide the overlay.
    // We accept EITHER `lameta:ready` OR any `lameta:request`: the client posts `ready` once
    // (which the host may race past — see PluginHostBridge.attach) and, once it has received
    // `init`, starts issuing requests. Treating a request as proof-of-life means a plugin that
    // connected via the bridge's proactive init (its one-shot `ready` having been missed here
    // too) still clears the overlay, while a genuinely broken plugin that never speaks still
    // trips the timeout.
    const readyListener = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return;
      const type = event.data && event.data.type;
      if (type === "lameta:ready" || type === "lameta:request") {
        setStatus("ready");
      }
    };
    window.addEventListener("message", readyListener);
    bridge.attach();

    const timer = setTimeout(() => {
      setStatus((s) => (s === "ready" ? s : "timeout"));
    }, HANDSHAKE_TIMEOUT_MS);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("message", readyListener);
      bridge.detach();
    };
  }, [iframeKey, apiSupported]);

  if (!apiSupported) {
    return (
      <div className="plugin-unsupported" css={messageCss}>
        <p>
          <Trans>
            This plugin requires a newer version of lameta (plugin API version{" "}
            {props.apiVersion}).
          </Trans>
        </p>
      </div>
    );
  }

  const src = URL.pathToFileURL(
    Path.join(props.pluginDir, props.entry)
  ).toString();

  const aboutLabel = props.pluginLabel || props.pluginName;
  const cornerBadge = props.pluginInfoUrl ? (
    <a
      css={cornerBadgeCss}
      data-testid="plugin-about-link"
      title={props.pluginInfoUrl}
      href={props.pluginInfoUrl}
      onClick={(e) => {
        e.preventDefault();
        require("electron").shell.openExternal(props.pluginInfoUrl!);
      }}
    >
      <img src={pluginIcon} alt="" css={cornerIconCss} />
      <Trans>About {aboutLabel}</Trans>
    </a>
  ) : (
    <span css={cornerBadgeCss} data-testid="plugin-name-badge">
      <img src={pluginIcon} alt="" css={cornerIconCss} />
      {props.pluginName}
    </span>
  );

  return (
    <div
      css={css`
        position: relative;
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        min-height: 400px;
      `}
    >
      {/* Thin identity strip above the plugin's iframe, so the badge never overlaps the
          plugin's own UI. It sits at the top of the panel (which the tab strip already leaves
          close under its line); no negative margin, which would push it above the panel's
          overflow:auto content box and clip it. */}
      <div
        css={css`
          display: flex;
          justify-content: flex-end;
          padding: 0 8px;
        `}
      >
        {cornerBadge}
      </div>
      <iframe
        key={iframeKey}
        ref={iframeRef}
        data-testid="plugin-frame"
        // Let plugins record audio via getUserMedia (e.g. careful-speech recorders).
        allow="microphone"
        src={src}
        css={css`
          width: 100%;
          flex: 1;
          min-height: 0;
          border: none;
        `}
      />
      {status === "timeout" && (
        <div className="plugin-timeout" css={overlayCss}>
          <p>
            <Trans>This plugin failed to start.</Trans>
          </p>
          <button
            onClick={() => {
              setStatus("connecting");
              setAttempt((a) => a + 1);
            }}
          >
            <Trans>Reload</Trans>
          </button>
        </div>
      )}
    </div>
  );
};

const messageCss = css`
  padding: 20px;
`;

// The little identity badge in the pane's upper-right corner: plugin icon + name, or an
// "About <label>" link when the manifest has an info-url. Spec'd as 90%-opaque black.
const cornerBadgeCss = css`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  line-height: 14px;
  color: rgba(0, 0, 0, 0.9);
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`;

// The svg is solid black, so 0.9 opacity renders it 90%-opaque black to match the text.
const cornerIconCss = css`
  width: 12px;
  height: 12px;
  opacity: 0.9;
`;

const overlayCss = css`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.9);
`;

export default PluginTabPanel;
