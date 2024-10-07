import * as React from "react";
import { css } from "@emotion/react";
import { Folder } from "../model/Folder/Folder";
import { Project } from "../model/Project/Project";
import {
  JsonView,
  allExpanded,
  darkStyles,
  defaultStyles
} from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";
import { getRoCrate } from "../export/RoCrateExporter";
import { Session } from "../model/Project/Session/Session";

export const RoCrateView: React.FunctionComponent<{
  target: any;

  // note, folder will equal project if we're generating at the project level
  // otherwise, folder will be a session or person
  project: Project;

  folder: Folder;
}> = (props) => {
  const [json, setJson] = React.useState<object>({});

  React.useEffect(() => {
    if (props.target instanceof Project) {
      setJson(getRoCrate(props.target as Project));
    }
  }, [props.target, props.project, props.folder]);

  React.useEffect(() => {
    if (props.target instanceof Session) {
      setJson(getRoCrate(props.target as Session));
    }
  }, [props.target, props.project, props.folder]);

  return (
    <div
      css={css`
        height: 500px;
        width: 100%;

        display: flex;
        flex-direction: column;
        flex-grow: 1; // <--  grow to fit available space and then...
        overflow: hidden; // <-- ... show scroll if too big, instead of just going off the screen.
        code,
        code * {
          font-family: sans-serif;
          white-space: pre-wrap;
        }
        pre {
          flex: 1; // fill space
        }
      `}
    >
      <JsonView data={json} shouldExpandNode={allExpanded} style={darkStyles} />
    </div>
  );
};
