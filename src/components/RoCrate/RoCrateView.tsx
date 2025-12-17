import * as React from "react";
import { css } from "@emotion/react";
import { Folder } from "../../model/Folder/Folder";
import { Project } from "../../model/Project/Project";
import { getRoCrate } from "../../export/ROCrate/RoCrateExporter";
import { validateRoCrate, ValidationResult } from "./validation";
import { SearchableCodeViewer } from "../SearchableCodeViewer";

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
    const loadAndValidate = async () => {
      try {
        const json = await getRoCrate(props.project, props.folder);
        setJson(json);

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
      } catch (e) {
        console.error("Error loading RoCrate:", e);
        setJson({});
      }
    };

    loadAndValidate();
  }, [props.project, props.folder, props.doValidate]);

  const jsonString = React.useMemo(() => JSON.stringify(json, null, 2), [json]);

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
        content={jsonString}
        language="json"
        autoFocusSearch={true}
        headerContent={
          validationResults && (
            <span
              css={css`
                font-size: 0.8rem;
                white-space: nowrap;
              `}
            >
              {`Validation Results  ⛔${validationResults.errors.length} / ⚠️${validationResults.warnings.length} / ℹ️ ${validationResults.info.length}`}
            </span>
          )
        }
      />
    </div>
  );
};
