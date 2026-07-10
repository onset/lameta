import { css } from "@emotion/react";
import * as React from "react";
import { observer } from "mobx-react";
import { t, Trans } from "@lingui/macro";
import { cloudReadGuard } from "../other/cloudReadGuard";
import { Project } from "../model/Project/Project";

// A single, persistent banner shown across the top of the project view when a
// cloud sync provider (OneDrive, Dropbox, Nextcloud, ...) couldn't deliver one
// or more files during load. It replaces what would otherwise be a storm of
// per-file error toasts (and provider modal dialogs). See cloudReadGuard.
export const CloudUnavailableBanner: React.FunctionComponent<{
  project: Project;
}> = observer((props) => {
  const [dismissed, setDismissed] = React.useState(false);
  const [retrying, setRetrying] = React.useState(false);

  const failures = cloudReadGuard.failedReads;
  const count = failures.length;

  // Re-show the banner if a fresh batch of failures comes in after a dismissal.
  React.useEffect(() => {
    if (count > 0) setDismissed(false);
  }, [count]);

  if (count === 0 || dismissed) {
    return null;
  }

  // If every failure is from the same provider, name it; otherwise stay generic.
  const providerNames = Array.from(
    new Set(failures.map((f) => f.providerName).filter(Boolean))
  );
  const providerName =
    providerNames.length === 1 ? (providerNames[0] as string) : t`the cloud`;

  const message =
    count === 1
      ? t`lameta couldn't download 1 file from ${providerName}. It may be offline or busy right now.`
      : t`lameta couldn't download ${count} files from ${providerName}. It may be offline or busy right now.`;

  const onRetry = () => {
    setRetrying(true);
    // Let the button repaint as "retrying" before the synchronous re-reads run.
    window.setTimeout(() => {
      try {
        props.project.retryFailedCloudReads();
      } finally {
        setRetrying(false);
      }
    }, 0);
  };

  return (
    <div
      css={css`
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 16px;
        background: #fdf3d8;
        border-bottom: 1px solid #e6d18f;
        color: #5a4a1a;
        font-size: 14px;
        flex-shrink: 0;
      `}
      data-testid="cloud-unavailable-banner"
    >
      <span css={css`font-size: 18px;`} aria-hidden={true}>
        ⚠️
      </span>
      <span css={css`flex: 1;`}>{message}</span>
      <button
        onClick={onRetry}
        disabled={retrying}
        css={css`
          border: 1px solid #b8922a;
          background: ${retrying ? "#efe2b8" : "#ffffff"};
          color: #5a4a1a;
          border-radius: 6px;
          padding: 5px 14px;
          font-size: 14px;
          cursor: ${retrying ? "default" : "pointer"};
          &:hover {
            background: ${retrying ? "#efe2b8" : "#fbf6e6"};
          }
        `}
      >
        {retrying ? <Trans>Retrying…</Trans> : <Trans>Retry</Trans>}
      </button>
      <button
        onClick={() => setDismissed(true)}
        aria-label={t`Dismiss`}
        css={css`
          border: none;
          background: transparent;
          color: #5a4a1a;
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
          padding: 2px 6px;
        `}
      >
        ×
      </button>
    </div>
  );
});
