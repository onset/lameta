import * as React from "react";
import { css } from "@emotion/react";
import { Folder } from "../../model/Folder/Folder";
import { Project } from "../../model/Project/Project";
import { getRoCrate } from "../../export/RoCrateExporter";
import FindInPage from "../FindInPage";
import { JsonView } from "./JsonView";
import { Tab, TabList, TabPanel, Tabs } from "react-tabs";
import { ValidationResultsList } from "./RoCrateValidationResults";
import { validate } from "./LDAC-RoCrate-Profile.es.js";
import * as fs from "fs";

export const RoCrateView: React.FunctionComponent<{
  // note, folder will equal project if we're generating at the project level
  // otherwise, folder will be a session or person
  project: Project;
  folder: Folder;
  doValidate: boolean;
}> = (props) => {
  const [json, setJson] = React.useState<object>({});
  const [validation, setValidation] =
    React.useState<object[] | undefined>(undefined);

  React.useEffect(() => {
    const json = getRoCrate(props.project, props.folder);
    setJson(json);
    fs.writeFileSync(
      "c:/dev/ldac-profile/lameta.json",
      JSON.stringify(json, null, 2)
    );
    if (props.doValidate) {
      let errors;
      try {
        errors = validate(json);
      } catch (e) {
        //throw e;
        errors = [{ message: `${e.message} ${e.stack}` }];
      }
      setValidation(errors);
    }
  }, [props.project, props.folder, props.doValidate]);

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
      <FindInPage />
      <Tabs
        css={css`
          height: 100%;
        `}
      >
        <TabList>
          <Tab>Ro-Crate</Tab>

          {validation && (
            <Tab>{`Validation Results  ⛔${validation?.errors?.length} / ⚠️${validation?.warnings?.length} / ℹ️ ${validation?.info?.length}`}</Tab>
          )}
        </TabList>

        <TabPanel>
          <JsonView value={json} />
        </TabPanel>
        <TabPanel>
          <div
            css={css`
              max-height: 600px; // todo. The parent container seems to not be bounded so 100% here just takes us off the screen
              overflow-y: auto;
            `}
          >
            <ValidationResultsList list={validation} />
          </div>
        </TabPanel>
      </Tabs>
    </div>
  );
};
