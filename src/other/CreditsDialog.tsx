import { css } from "@emotion/react";
/* removed emotion jsx declaration */

import * as React from "react";
import { Button } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { ShowMessageDialog } from "../components/ShowMessageDialog/MessageDialog";
import { NotifyException } from "../components/Notify";

const citation =
  "Hatton, John, Gary Holton, Mandana Seyfeddinipur, Nick Thieberger. 2021. Lameta [software] https://github.com/onset/laMETA/releases";

export function ShowCreditsDialog() {
  ShowMessageDialog({
    width: "400px",
    iconPath: null,
    content: (
      <React.Fragment>
        <h1
          css={css`
            font-size: 24px;
            font-weight: bold;
            margin: 0;
          `}
        >
          Credits
        </h1>
        <p>
          Lameta project led by Gary Holton, Mandana Seyfeddinipur, Nick
          Thieberger. Software development by John Hatton.
        </p>
        <p>
          Funding from the National Science Foundation (BCS-1648984), ARC Centre
          of Excellence for the Dynamics of Language, and Endangered Languages
          Documentation Programme.
        </p>
        <p>
          Illustration 'Profile Man &amp; Woman' by mikicon from the Noun
          Project
        </p>
        <div
          css={css`
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
          `}
        >
          <strong>Please cite Lameta as follows:</strong>
          <CopyCitationButton />
        </div>
        <p>{citation}</p>
      </React.Fragment>
    )
  });
}

const CopyCitationButton: React.FunctionComponent = () => {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    navigator.clipboard
      .writeText(citation)
      .then(() => setCopied(true))
      .catch((err) => NotifyException(err as Error));
  };
  return (
    <Button
      size="small"
      onClick={copy}
      startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
      css={css`
        text-transform: none;
        flex-shrink: 0;
      `}
    >
      {copied ? "Copied" : "Copy"}
    </Button>
  );
};
