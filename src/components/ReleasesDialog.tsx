import { css } from "@emotion/react";
/* removed emotion jsx declaration */
import * as React from "react";
import ReactModal from "react-modal";
import CloseOnEscape from "react-close-on-escape";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import * as _ from "lodash";
import pkg from "package.json";
const ReactMarkdown = require("react-markdown");
import { sentryException } from "../other/errorHandling";
import axios from "axios";
import {
  NotifyAlphaUpdateDownloaded,
  NotifyAlphaUpdateDownloading,
  NotifyNoBigDeal,
  NotifyUpdateAvailable,
  NotifyUpToDate,
  NotifyWarning,
} from "./Notify";
import { CopyManager } from "../other/CopyManager";
import { lameta_blue, lameta_orange } from "../containers/theme";
import { getTestEnvironment } from "../getTestEnvironment";
import {
  getNewerReleases,
  getReleaseToInstall,
  newestOfEachChannel,
  sortNewestFirst,
} from "./releaseChannels";
import {
  canInstallUpdates,
  checkForAlphaUpdate,
  downloadRelease,
  installNow,
  onAlphaUpdateDownloaded,
} from "../other/updaterIpc";

type Mode = "querying" | "update-available" | "just-show-release-notes" | "closed";

type InstallState =
  | { kind: "idle" }
  | { kind: "downloading"; percent: number }
  | { kind: "ready"; version: string }
  | { kind: "failed"; message: string };

interface IGithubRelease {
  assets: { browser_download_url: string }[];
  body: string;
  created_at: string;
  draft: boolean;
  html_url: string;
  name: string;
  prerelease: boolean;
  published_at: string;
  tag_name: string;
}

// manual: the user chose Help > Check for Updates, so open the dialog straight away instead of
// showing a toast, and say so when there is nothing newer.
let checkForUpdates: (manual: boolean) => void = () => {};
let showDialogManually: () => void;
export { showDialogManually as ShowReleasesDialog };
export function CheckForUpdates() {
  checkForUpdates(true);
}

export const ReleasesDialog: React.FunctionComponent<{}> = () => {
  const [mode, setMode] = React.useState<Mode>("querying");
  const [allReleases, setAllReleases] = React.useState<IGithubRelease[]>([]);
  const [showNewReleasesOnly, setShowNewReleasesOnly] = React.useState(true);
  const [version, setVersion] = React.useState("");
  React.useEffect(() => {
    setVersion(pkg.version);
  }, []);
  //  console.log("Version = " + version);
  //checkForUpdates = (callback: (haveUpdates: boolean) => void) => {
  checkForUpdates = (manual: boolean) => {
    const github = axios
      // GitHub's maximum page; a running release missing from the page loses its cross-channel news
      .get(
        `https://api.github.com/repos/${getTestEnvironment().LAMETA_RELEASES_REPO}/releases?per_page=100`,
      )
      .then((result) => {
        // Newest first by date: each channel numbers its versions separately, so the
        // numbers cannot order releases from different channels.
        const all = sortNewestFirst<IGithubRelease>(
          result.data.filter((r: IGithubRelease) => r.draft === false),
        );

        // const all = [
        //   {
        //     assets: [],
        //     body: "foo",
        //     created_at: "",
        //     draft: false,
        //     html_url: "",
        //     name: "foo",
        //     prerelease: false,
        //     published_at: "",
        //     tag_name: "0.8.0-beta.1",
        //   },
        // ];
        setAllReleases(all);
        const newer = getNewerReleases(all, pkg.version).length > 0;
        if (newer) {
          if (manual) {
            setShowNewReleasesOnly(true);
            setMode("update-available");
          } else NotifyUpdateAvailable(() => setMode("update-available"));
        }
        return newer;
      })
      .catch((error) => {
        NotifyNoBigDeal("Could not check for updates");
        console.error(`There was an error checking for updates.`);
        sentryException(error);
        return undefined;
      });
    if (!manual) return;
    // At startup, main.ts has already started the alpha check.
    const alpha = checkForAlphaUpdate().catch((error) => {
      sentryException(error);
      return null;
    });
    Promise.all([github, alpha])
      .then(([newerOnGitHub, alphaUpdate]) => {
        if (alphaUpdate?.downloaded) NotifyAlphaUpdateDownloaded(alphaUpdate.version);
        else if (alphaUpdate) NotifyAlphaUpdateDownloading(alphaUpdate.version);
        else if (newerOnGitHub === false) NotifyUpToDate(pkg.version);
      })
      .catch((error) => sentryException(error));
  };

  React.useEffect(() => {
    showDialogManually = () => {
      setShowNewReleasesOnly(false);
      setMode("just-show-release-notes");
    };
  });

  const [canInstall, setCanInstall] = React.useState(false);
  const [install, setInstall] = React.useState<InstallState>({ kind: "idle" });

  // run once on startup
  React.useEffect(() => {
    // this is works fine in e2e test but the notification covers stuff up that we may want to click so it slows things down
    if (!getTestEnvironment().E2E) checkForUpdates(false);
    canInstallUpdates()
      .then(setCanInstall)
      .catch(() => setCanInstall(false));
    onAlphaUpdateDownloaded(NotifyAlphaUpdateDownloaded);
  }, []);

  const releaseToInstall = canInstall ? getReleaseToInstall(allReleases, pkg.version) : undefined;

  const startInstall = (release: IGithubRelease) => {
    setInstall({ kind: "downloading", percent: 0 });
    downloadRelease(release.tag_name, (percent) => setInstall({ kind: "downloading", percent }))
      .then((version) => setInstall({ kind: "ready", version }))
      .catch((error) => {
        console.error("Could not download the update:", error);
        setInstall({ kind: "failed", message: String(error?.message ?? error) });
      });
  };

  const releasesToShow = showNewReleasesOnly
    ? getNewerReleases(allReleases, pkg.version)
    : allReleases;
  const releasesToOfferForDownload = newestOfEachChannel(releasesToShow);

  //const notes = notesArray ? notesArray!.map((n) => n.note).join("<br/>") : "";
  return (
    <CloseOnEscape onEscape={() => setMode("closed")}>
      <ReactModal
        ariaHideApp={false}
        className="releaseDialog" // this cannot be empty, even if you don't use it, else the dialog is shoved to the upper left
        isOpen={mode === "just-show-release-notes" || mode === "update-available"}
        shouldCloseOnOverlayClick={true}
        onRequestClose={() => setMode("closed")}
      >
        <div className={"dialogTitle "}>
          <div>
            <Trans>Release Notes</Trans>
          </div>
          <div
            css={css`
              float: right;
              font-size: 16px;
              color: ${lameta_orange};
              margin-bottom: auto;
              margin-top: auto;
            `}
          >
            {/* I couldn't get version to show up inside this string in a packaged lameta, just dev. That's why it is now outside. */}
            {t`You are running lameta version:`}
            &nbsp;{version}
          </div>
        </div>
        <div
          className="dialogContent"
          css={css`
            width: 700px;
            height: 600px;
            max-height: 600px;
            display: block !important;
          `}
        >
          <div
            css={css`
              min-height: 100px;
              overflow: hidden;
            `}
          >
            {!allReleases ||
              (allReleases.length === 0 && (
                <p>Sorry, lameta could not retrieve the release notes from github.</p>
              ))}
            {releasesToShow.map((release) => (
              <div
                key={release.name}
                css={css`
                  &:not(:first-child) {
                    margin-top: sem !important;
                  }
                `}
              >
                <h1
                  css={css`
                    margin-bottom: 10px !important;
                    background-color: ${lameta_blue};
                    padding: 5px;
                    padding-bottom: 35px;
                    font-size: 14pt !important;
                    padding-left: 10px;
                  `}
                >
                  {release.name}
                  {/* If we're showing the dialog prompting them to upgrade, only offer the newest release of each channel for Downloading */}
                  {release === releaseToInstall && install.kind !== "failed" ? (
                    <button
                      css={css`
                        float: right;
                      `}
                      disabled={install.kind !== "idle"}
                      onClick={() => startInstall(release)}
                    >
                      <Trans>Install</Trans>
                    </button>
                  ) : (
                    (releasesToOfferForDownload.has(release) ||
                      mode === "just-show-release-notes") &&
                    getDownloadUrl(release) && (
                      <a
                        css={css`
                          float: right;
                        `}
                        href={getDownloadUrl(release)}
                      >
                        <Trans>Download</Trans>
                      </a>
                    )
                  )}
                </h1>

                <ReactMarkdown
                  // note: the gfm plugin actually did worse that standard... it turned 2nd level bullets into <pre>
                  css={css`
                    * {
                      max-width: 100%;
                    }
                  `}
                  children={release.body}
                />
              </div>
            ))}
          </div>
        </div>
        <div
          css={css`
            width: 100%;
            padding-left: 40px;
          `}
          className={"bottomButtonRow"}
        >
          {mode === "update-available" && (
            <label
              css={css`
                margin-right: auto;
              `}
            >
              <input
                type="checkbox"
                checked={!showNewReleasesOnly}
                onChange={(event) => {
                  setShowNewReleasesOnly(!event.target.checked);
                }}
              ></input>
              {t`Show more releases`}
            </label>
          )}
          {install.kind === "downloading" && (
            <span>{t`Downloading the update: ${Math.round(install.percent)}%`}</span>
          )}
          {install.kind === "failed" && (
            <span>{t`lameta could not download the update. Use the Download link instead.`}</span>
          )}
          <div
            className={"reverseOrderOnMac"}
            css={css`
              margin-left: auto;
            `}
          >
            {install.kind === "ready" && (
              <button
                className="default"
                onClick={() => {
                  // On Windows the installer starts before lameta quits, so a quit that the
                  // copy-in-progress question cancels would still be cut off by the installer.
                  if (CopyManager.filesAreStillCopying()) {
                    NotifyWarning(
                      t`Files are still being copied into your project. Install the update once they are done.`,
                    );
                    return;
                  }
                  installNow().catch((error) => {
                    sentryException(error);
                    setInstall({ kind: "failed", message: String(error?.message ?? error) });
                  });
                }}
              >
                {t`Restart and install ${install.version}`}
              </button>
            )}
            <button onClick={() => setMode("closed")}>
              <Trans>Close</Trans>
            </button>
          </div>
        </div>
      </ReactModal>
    </CloseOnEscape>
  );
};

function getDownloadUrl(release: any) {
  try {
    const platformToExtension = { win32: "exe", darwin: "dmg" };
    const installerExtension = platformToExtension[process.platform];
    const url = (release.assets as Array<any>).find((a) =>
      _.endsWith(a.browser_download_url, installerExtension),
    );
    return url?.browser_download_url;
  } catch (error) {
    sentryException(error);
    return undefined;
  }
}
