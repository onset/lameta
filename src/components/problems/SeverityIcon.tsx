import { css } from "@emotion/react";
import * as React from "react";
import CancelIcon from "@mui/icons-material/Cancel";
import WarningIcon from "@mui/icons-material/Warning";
import { ProblemSeverity } from "../../problems/problemSeverity";

// The colour of each severity on a white background, as in the Problems sidebar
export const kSeverityColors: Record<ProblemSeverity, string> = {
  error: "#c62828",
  warning: "#e69500",
};

const kIcons = {
  error: CancelIcon,
  warning: WarningIcon,
};

// The × and ! of these icons are holes in the shape. A white patch behind the
// hole keeps them white on the tabs' coloured backgrounds too. The numbers are
// fractions of the icon's 24-unit box, inside the shape and around the hole.
const kWhitePatch: Record<ProblemSeverity, string> = {
  // a disc inside the circle
  error: "left: 20%; top: 20%; width: 60%; height: 60%; border-radius: 50%;",
  // a strip inside the triangle, around the "!"
  warning: "left: 41%; top: 37%; width: 18%; height: 43%;",
};

// The icon for a problem or a warning, wherever lameta shows one: a filled red
// circle with a white ×, or an orange triangle with a white !
export const SeverityIcon: React.FunctionComponent<{
  severity: ProblemSeverity;
  color?: string;
  // "small" is MUI's small icon size; otherwise the icon is as big as the font
  fontSize?: "inherit" | "small";
}> = (props) => {
  const Icon = kIcons[props.severity];
  return (
    <span
      data-testid={`severity-icon-${props.severity}`}
      css={css`
        position: relative;
        display: inline-flex;
        flex-shrink: 0;
        font-size: ${props.fontSize === "inherit" ? "inherit" : "1.25rem"};
        &::before {
          content: "";
          position: absolute;
          ${kWhitePatch[props.severity]}
          background-color: white;
        }
        svg {
          position: relative;
        }
      `}
    >
      <Icon fontSize="inherit" htmlColor={props.color ?? kSeverityColors[props.severity]} />
    </span>
  );
};
