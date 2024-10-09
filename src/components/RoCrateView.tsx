import * as React from "react";
import { css } from "@emotion/react";
import { Folder } from "../model/Folder/Folder";
import { Project } from "../model/Project/Project";
import { lameta_orange } from "../containers/theme";
import { getRoCrate } from "../export/RoCrateExporter";
import { JsonViewer } from "@textea/json-viewer";

export const RoCrateView: React.FunctionComponent<{
  // note, folder will equal project if we're generating at the project level
  // otherwise, folder will be a session or person
  project: Project;

  folder: Folder;
}> = (props) => {
  const [json, setJson] = React.useState<object>({});

  React.useEffect(() => {
    setJson(getRoCrate(props.folder));
  }, [props.project, props.folder]);

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
      {/* <JsonView data={json} shouldExpandNode={allExpanded} style={darkStyles} /> */}
      <JsonViewer
        value={json}
        theme={"dark"}
        quotesOnKeys={false}
        displayDataTypes={false}
        displaySize={false}
        css={css`
          height: 100%;
          overflow-y: scroll;
          .data-key {
            color: #ff934f; /*${lameta_orange};*/
            font-weight: bold;
          }
          .data-type-label {
            color: #becde4;
          }
          .string-value {
            color: white;
          }
        `}
      />
    </div>
  );
};
