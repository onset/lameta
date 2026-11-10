import { css } from "@emotion/react";
import * as React from "react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { CircularProgress } from "@mui/material";
import { IProblem } from "../../problems/problems";
import { IProjectCheck } from "../../problems/checkProject";
import { SeverityIcon } from "../problems/SeverityIcon";
import { ProblemWording } from "../problems/ProblemWording";

// Where a problem is, as the export dialog lists it, e.g. "Session ETR009"
export function placeOfProblem(p: IProblem): string {
  const target = p.target;
  if (target?.folderType === "person") return t`Person ${target.folderId}`;
  if (p.sessionId) return t`Session ${p.sessionId}`;
  return t`Project`;
}

// A problem as a line of plain text, for copying the list to the clipboard
export function problemAsText(p: IProblem): string {
  const severity = p.severity === "error" ? t`Problem` : t`Warning`;
  const file = p.target?.fileName ? ` (${p.target.fileName})` : "";
  return [`${severity}: ${placeOfProblem(p)}${file}: ${p.message}`, p.reason]
    .filter((x) => x)
    .join(" ");
}

// The problems that the checks found, with where each one is
export const ExportProblemsList: React.FunctionComponent<{
  problems: IProblem[];
}> = (props) => (
  <div
    data-testid="export-problems"
    css={css`
      max-height: 200px;
      overflow-y: auto;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 13px;
      line-height: 18px;
    `}
  >
    {props.problems.map((p) => (
      <div
        key={p.key}
        css={css`
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 4px 0;
          & > [data-testid^="severity-icon"] {
            font-size: 16px;
            margin-top: 1px;
          }
        `}
      >
        <SeverityIcon severity={p.severity} fontSize="inherit" />
        <div
          css={css`
            min-width: 0;
            overflow-wrap: anywhere;
          `}
        >
          <div
            css={css`
              color: rgba(0, 0, 0, 0.6);
              font-size: 12px;
            `}
          >
            {placeOfProblem(p)}
          </div>
          <ProblemWording wording={p} fileName={p.target?.fileName} />
        </div>
      </div>
    ))}
  </div>
);

// Before exporting: how many problems and warnings the checks found in what would
// be exported
export const ExportProblemsSummary: React.FunctionComponent<{
  // undefined while the checks run
  check: IProjectCheck | undefined;
  problems: IProblem[];
  align: "left" | "right";
}> = (props) => {
  const side = props.align === "left" ? "flex-start" : "flex-end";
  if (!props.check)
    return (
      <div
        data-testid="export-checking"
        css={css`
          display: flex;
          align-items: center;
          justify-content: ${side};
          gap: 8px;
          margin-top: ${props.align === "left" ? 0 : 16}px;
        `}
      >
        <CircularProgress size={16} />
        <Trans>Checking the project…</Trans>
      </div>
    );
  const errors = props.problems.filter((p) => p.severity === "error").length;
  const warnings = props.problems.length - errors;
  return (
    <div
      data-testid="export-problems-summary"
      data-problem-count={props.problems.length}
      css={css`
        display: flex;
        flex-direction: column;
        gap: 8px;
        align-items: ${side};
        margin-top: ${props.align === "left" ? 0 : 16}px;
      `}
    >
      <div
        css={css`
          display: flex;
          align-items: center;
          gap: 12px;
          [data-testid^="severity-icon"] {
            font-size: 16px;
          }
        `}
      >
        {props.problems.length === 0 ? (
          props.check.checkErrors.length > 0 ? (
            <Trans>lameta found no problems in what it could check.</Trans>
          ) : (
            <Trans>lameta found no problems.</Trans>
          )
        ) : (
          <>
            <span
              css={css`
                display: flex;
                align-items: center;
                gap: 4px;
              `}
            >
              <SeverityIcon severity="error" />
              <Trans>{errors} problems</Trans>
            </span>
            <span
              css={css`
                display: flex;
                align-items: center;
                gap: 4px;
              `}
            >
              <SeverityIcon severity="warning" />
              <Trans>{warnings} warnings</Trans>
            </span>
          </>
        )}
      </div>
      {props.check.checkErrors.length > 0 && (
        <div
          css={css`
            color: #9b1c1c;
          `}
        >
          {t`lameta could not check everything:`}{" "}
          {props.check.checkErrors.map((e) => e.message).join(" ")}
        </div>
      )}
    </div>
  );
};
