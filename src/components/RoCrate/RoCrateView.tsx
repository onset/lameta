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
import { Box, Divider, Grid } from "@mui/material";

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
    if (props.doValidate) {
      let errors;
      try {
        errors = validate(json);
        // strip out errors that have a property of "license" for now. The validator does not match even the test data from its own repo
        errors.errors = errors.errors.filter((error) => {
          return error.property !== "license";
        });
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
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          maxHeight: "100%",
          overflow: "hidden" // Prevents overflow from the container
        }}
      >
        <Grid
          container
          spacing={0}
          sx={{
            flexGrow: 1,
            //maxHeight: "100%",
            overflowY: "hidden"
          }}
        >
          {/* First column */}
          <Grid
            item
            xs={12}
            md={6}
            sx={{
              flexGrow: 1,
              maxHeight: "100%",
              overflowY: "auto" // Makes the column scrollable if content overflows
            }}
          >
            <JsonView value={json} />
          </Grid>

          {/* Second column */}
          <Grid
            item
            xs={12}
            md={6}
            sx={{
              paddingLeft: 2,
              flexGrow: 1,
              maxHeight: "100%",
              overflowY: "auto" // Makes the column scrollable if content overflows
            }}
          >
            {validation && (
              <div>
                <div>{`Validation Results  ⛔${validation?.errors?.length} / ⚠️${validation?.warnings?.length} / ℹ️ ${validation?.info?.length}`}</div>
                <ValidationResultsList list={validation} />
              </div>
            )}
          </Grid>
        </Grid>
      </Box>
    </div>
  );
};
