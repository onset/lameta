import * as React from "react";
import { css } from "@emotion/react";
import { Folder } from "../model/Folder/Folder";
import ImdiGenerator, { IMDIMode } from "../export/ImdiGenerator";
import { Session } from "../model/Project/Session/Session";
import { Project } from "../model/Project/Project";
import { Person } from "../model/Project/Person/Person";
import { File } from "../model/file/File";
//import SyntaxHighlighter from 'react-syntax-highlighter';
import { Button } from "@material-ui/core";
import SyntaxHighlighter, {
  registerLanguage
} from "react-syntax-highlighter/light";
import xmlLang from "react-syntax-highlighter/languages/hljs/xml";
import syntaxStyle from "./ImdiSyntaxStyle";
import { mainProcessApi } from "../MainProcessApiAccess";
import { XMLValidationResult } from "xmllint-wasm";
registerLanguage("xml", xmlLang);

export const ImdiView: React.FunctionComponent<{
  // including the function prevented the react hot loader from giving us new xml
  // when the code changed
  //contentGenerator: (folder: Folder) => string;
  target: any;

  // note, folder will equal project if we're generating at the project level
  // otherwise, folder will be a session or person
  project: Project;

  folder: Folder;
}> = (props) => {
  const [imdi, setImdi] = React.useState<string>("");

  const [validationResult, SetValidationResult] = React.useState<
    XMLValidationResult | undefined
  >();

  React.useEffect(() => {
    if (props.target instanceof Session) {
      setImdi(
        ImdiGenerator.generateSession(
          IMDIMode.OPEX,
          props.target as Session,
          props.project
        )
      );
    } else if (props.target instanceof Project) {
      setImdi(
        ImdiGenerator.generateCorpus(
          IMDIMode.RAW_IMDI,
          props.target as Project,
          new Array<string>() /* we don't bother to compute the children IMDI's for this view */
        )
      );
    } else if (props.target instanceof Person) {
      const generator = new ImdiGenerator(
        IMDIMode.RAW_IMDI,
        props.target,
        props.project
      );
      setImdi(
        generator.actor(
          props.target as Person,
          "will get role in context of session",
          new Date() // normally this will be the date of the session for which the IMDI is being exported, but for here we can use today
        ) as string
      );
    } else if (props.target instanceof File) {
      const generator = new ImdiGenerator(
        IMDIMode.RAW_IMDI,
        props.folder,
        props.project
      );
      setImdi(generator.resourceFile(props.target as File) as string);
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
      <div
        css={css`
          display: flex;
          justify-content: flex-end;
          padding: 10px;
        `}
      >
        {!validationResult && (
          <Button
            variant="contained"
            onClick={async () => {
              const r = await mainProcessApi.validateImdi(imdi);
              SetValidationResult(r);
            }}
          >
            Validate
          </Button>
        )}
      </div>
      {validationResult?.valid && (
        <div
          css={css`
            color: white;
            font-weight: 500;
            text-align: right;
            font-size: 24px;
          `}
        >
          ✔ Valid
        </div>
      )}
      {validationResult && (
        <div>
          {validationResult.errors.map((e) => {
            return (
              <div
                css={css`
                  color: white;
                  font-weight: 500;
                  background-color: red;
                  padding: 10px;
                `}
              >
                {e.message}
              </div>
            );
          })}
        </div>
      )}
      <SyntaxHighlighter
        language="xml"
        style={{ ...syntaxStyle, marginTop: 0, paddingTop: 0 }}
      >
        {imdi}
      </SyntaxHighlighter>
    </div>
  );
};
