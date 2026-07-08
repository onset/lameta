import { css } from "@emotion/react";
/* removed emotion jsx declaration */

import * as React from "react";
import { observer } from "mobx-react";
import { t, Trans } from "@lingui/macro";
import { Tooltip } from "@mui/material";
import CloudOutlinedIcon from "@mui/icons-material/CloudOutlined";
import { Project } from "../model/Project/Project";
import { lameta_dark_blue } from "../containers/theme";

function countCloudOnlyFiles(project: Project): number {
  let count = 0;
  for (const f of project.files) {
    if (f.cloudStatus === "cloudOnly") count++;
  }
  for (const session of project.sessions.items) {
    for (const f of session.files) {
      if (f.cloudStatus === "cloudOnly") count++;
    }
  }
  for (const person of project.persons.items) {
    for (const f of person.files) {
      if (f.cloudStatus === "cloudOnly") count++;
    }
  }
  return count;
}

// This is in the upper right corner of the screen, next to CopyingStatus.
// Unlike CopyingStatus, this doesn't poll -- it's a plain MobX-observed
// computation over the files that are already loaded into memory, so it
// updates whenever some other code (FileList selection, window-focus
// refresh, etc.) changes a file's observable cloudStatus.
export const CloudFolderStatus: React.FunctionComponent<{
  project: Project;
}> = observer((props) => {
  const count = countCloudOnlyFiles(props.project);
  if (count === 0) {
    return null;
  }

  return (
    <Tooltip
      title={t`These files are online-only (OneDrive) and have not been fetched to this computer. Select a file to make it available.`}
    >
      <div
        css={css`
          display: flex;
          align-items: center;
          gap: 4px;
          color: ${lameta_dark_blue};
        `}
      >
        <CloudOutlinedIcon fontSize="small" />
        <span>
          <Trans>{count} files are online-only</Trans>
        </span>
      </div>
    </Tooltip>
  );
});
