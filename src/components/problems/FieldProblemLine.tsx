import { css } from "@emotion/react";
import * as React from "react";
import { observer } from "mobx-react";
import { Field } from "../../model/field/Field";
import { projectProblems } from "../../problems/ProjectProblems";
import { ProblemSeverity } from "../../problems/problemSeverity";
import { SeverityIcon } from "./SeverityIcon";
import { ProblemWording } from "./ProblemWording";
import userSettings from "../../other/UserSettings";

// The tab backgrounds are orange, green and blue, and the sidebar's orange for a
// warning is ugly or unreadable on them, so warnings are black here. The red is
// darker than the sidebar's so that it stays readable on the Project tab's orange.
const kSeverityColors: Record<ProblemSeverity, string> = {
  error: "#9b1c1c",
  warning: "rgba(0, 0, 0, 0.9)",
};

// Under a field's editor, the problems that the Problems sidebar lists for this
// field, worded the same way, except warnings, which only the sidebar shows. It only shows them; unlike
// an editor's `validate` prop it never blocks or reverts what the user typed.
// Only while the sidebar is open, so that someone filling in a new form is not
// faced with a message under every empty field.
export const FieldProblemLine: React.FunctionComponent<{
  field: Field | undefined;
}> = observer((props) => {
  const problems =
    props.field && userSettings.ShowProblems
      ? projectProblems.problemsOf(props.field).filter((p) => p.severity !== "warning")
      : [];
  if (problems.length === 0) return null;
  return (
    <div
      data-testid="field-problem"
      css={css`
        font-size: 12px;
        line-height: 1.3;
        margin-top: 2px;
        width: fit-content;
        padding: 2px 6px;
        border-radius: 3px;
        // mostly white, so that it is a very light version of whatever colour the
        // form is on, and the message is readable on all of them
        background-color: rgba(255, 255, 255, 0.85);
      `}
    >
      {problems.map((p, i) => (
        <div
          key={i}
          css={css`
            display: flex;
            align-items: flex-start;
            gap: 4px;
            & > [data-testid^="severity-icon"] {
              font-size: 14px;
              margin-top: 1px;
            }
          `}
          style={{ color: kSeverityColors[p.severity] }}
        >
          <SeverityIcon
            severity={p.severity}
            color={kSeverityColors[p.severity]}
            fontSize="inherit"
          />
          <div>
            <ProblemWording wording={p} secondaryColor="rgba(0, 0, 0, 0.7)" />
          </div>
        </div>
      ))}
    </div>
  );
});
