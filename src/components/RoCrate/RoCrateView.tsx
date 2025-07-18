import * as React from "react";
import { css } from "@emotion/react";
import { Folder } from "../../model/Folder/Folder";
import { Project } from "../../model/Project/Project";
import { getRoCrate } from "../../export/RoCrateExporter";
import FindInPage from "../FindInPage";
import { JsonView } from "./JsonView";
import { ValidationResultsList } from "./RoCrateValidationResults";
import { Box, Grid } from "@mui/material";
import { validateRoCrate, ValidationResult } from "./validation";

export const RoCrateView: React.FunctionComponent<{
  // note, folder will equal project if we're generating at the project level
  // otherwise, folder will be a session or person
  project: Project;
  folder: Folder;
  doValidate: boolean;
}> = (props) => {
  const [json, setJson] = React.useState<object>({});
  const [validationResults, setValidationResults] =
    React.useState<ValidationResult | undefined>(undefined);

  React.useEffect(() => {
    const validate = async () => {
      if (props.doValidate) {
        try {
          const entries = await validateRoCrate(json);
          // separate errors, warnings, and info
          setValidationResults({
            errors: entries.filter((entry) => entry.status === "error"),
            warnings: entries.filter((entry) => entry.status === "warning"),
            info: entries.filter((entry) => entry.status === "info")
          });

          // strip out errors that have a property of "license" for now. The validator does not match even the test data from its own repo
          // errors.errors = errors.errors.filter((error) => {
          //   return error.property !== "license";
          // });
        } catch (e) {
          //throw e;
          setValidationResults({
            errors: [
              {
                message: `${e.message} ${e.stack}`,
                id: "error",
                status: "error",
                clause: "error"
              }
            ],
            warnings: [],
            info: []
          });
        }
      }
    };

    const json = getRoCrate(props.project, props.folder);
    setJson(json);
    validate();
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
      <FindInPage autoFocus={true} />
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
            {validationResults && (
              <div>
                <div>{`Validation Results  ⛔${validationResults?.errors?.length} / ⚠️${validationResults?.warnings?.length} / ℹ️ ${validationResults?.info?.length}`}</div>
                <ValidationResultsList list={validationResults} />
              </div>
            )}
          </Grid>
        </Grid>
      </Box>
    </div>
  );
};
