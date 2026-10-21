import { css } from "@emotion/react";
import * as React from "react";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import { IProblemWording } from "../../problems/fieldRules";

// The words of a problem: the subject in bold and the text as one sentence, e.g.
// "**Access** is required.", then the file it is in, if any, and the reason, each
// on a line of its own in grey.
export const ProblemWording: React.FunctionComponent<{
  wording: Pick<IProblemWording, "subject" | "text" | "reason">;
  fileName?: string;
  // for the file and reason lines
  secondaryColor?: string;
}> = (props) => {
  const secondary = css`
    margin-top: 2px;
    font-size: 12px;
    line-height: 16px;
    color: ${props.secondaryColor ?? "rgba(0, 0, 0, 0.6)"};
  `;
  return (
    <>
      <div data-testid="problem-message">
        {props.wording.subject && (
          <>
            <strong
              data-testid="problem-subject"
              css={css`
                font-weight: 600;
              `}
            >
              {props.wording.subject}
            </strong>{" "}
          </>
        )}
        {props.wording.text}
      </div>
      {props.fileName && (
        <div
          data-testid="problem-file"
          css={css`
            ${secondary};
            display: flex;
            align-items: flex-start;
            gap: 4px;
            font-family: Consolas, "Courier New", monospace;
            font-size: 11.5px;
            svg {
              font-size: 13px;
              flex-shrink: 0;
              margin-top: 1px;
            }
          `}
        >
          <InsertDriveFileOutlinedIcon fontSize="inherit" />
          <span>{props.fileName}</span>
        </div>
      )}
      {props.wording.reason && (
        <div data-testid="problem-reason" css={secondary}>
          {props.wording.reason}
        </div>
      )}
    </>
  );
};
