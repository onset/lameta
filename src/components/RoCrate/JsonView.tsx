import * as React from "react";
import { css } from "@emotion/react";
import { lameta_orange } from "../../containers/theme";
import { JsonViewer, JsonViewerKeyRenderer } from "@textea/json-viewer";

export const JsonView: React.FunctionComponent<{ value: object }> = ({
  value
}) => {
  const KeyRenderer: JsonViewerKeyRenderer = ({ path }) => {
    const last = path[path.length - 1];
    return Number.isInteger(last) ? null : <span>{last}</span>;
  };
  KeyRenderer.when = () => true;

  return (
    <JsonViewer
      value={value}
      theme={"dark"}
      quotesOnKeys={false}
      displayDataTypes={false}
      displaySize={false}
      rootName={false}
      keyRenderer={KeyRenderer}
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
  );
};
