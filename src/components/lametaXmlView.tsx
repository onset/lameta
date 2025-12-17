import * as React from "react";
import { css } from "@emotion/react";
import { Folder } from "../model/Folder/Folder";
import { Project } from "../model/Project/Project";
import { SearchableCodeViewer } from "./SearchableCodeViewer";

export const LametaXmlView: React.FunctionComponent<{
  target: any;

  // note, folder will equal project if we're generating at the project level
  // otherwise, folder will be a session or person
  project: Project;

  folder: Folder;
}> = (props) => {
  const [xml, setXml] = React.useState<string>("");

  React.useEffect(() => {
    if (props.target instanceof Project) {
      setXml(props.project.metadataFile?.getXml(false) || "");
    }
  }, [props.target, props.project, props.folder]);

  return (
    <div
      css={css`
        height: 500px;
        width: 100%;
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        overflow: hidden;
      `}
    >
      <SearchableCodeViewer
        content={xml}
        language="xml"
        autoFocusSearch={true}
      />
    </div>
  );
};
