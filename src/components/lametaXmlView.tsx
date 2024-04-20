import * as React from "react";
import { css } from "@emotion/react";
import { Folder } from "../model/Folder/Folder";
import { Project } from "../model/Project/Project";
import SyntaxHighlighter, {
  registerLanguage
} from "react-syntax-highlighter/light";
import xmlLang from "react-syntax-highlighter/languages/hljs/xml";
import syntaxStyle from "./ImdiSyntaxStyle";
registerLanguage("xml", xmlLang);

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
        // Enhance: the size and scrolling of this got all messed up with the switch to electron 6
        // (though it could have been anything). It's currently a hack.
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
      <SyntaxHighlighter
        language="xml"
        style={{ ...syntaxStyle, marginTop: 0, paddingTop: 0 }}
      >
        {xml}
      </SyntaxHighlighter>
    </div>
  );
};
