import * as React from "react";
import { css } from "@emotion/react";
import { Folder } from "../../model/Folder/Folder";
import { Project } from "../../model/Project/Project";
import ImdiGenerator, { IMDIMode } from "../../export/ImdiGenerator";
import { mainProcessApi } from "../../mainProcess/MainProcessApiAccess";
import { XMLValidationResult } from "xmllint-wasm";
import Alert from "@mui/material/Alert";
import { Trans } from "@lingui/macro";
import { GetOtherConfigurationSettings } from "../../model/Project/OtherConfigurationSettings";
import { SearchableCodeViewer } from "../SearchableCodeViewer";

interface IProps {
  project: Project;
  folder: Folder;
  name: string;
}

/**
 * Shows the IMDI that would be generated for a document folder
 * (DescriptionDocuments or OtherDocuments).
 *
 * This mirrors what ImdiBundler.generateDocumentFolderData does during export.
 */
export const DocumentFolderImdiView: React.FunctionComponent<IProps> = (
  props
) => {
  const [imdi, setImdi] = React.useState<string>("");
  const [validationResult, setValidationResult] =
    React.useState<XMLValidationResult | undefined>();
  const [schemaName, setSchemaName] = React.useState<string>("IMDI_3.0.xsd");

  // Generate the IMDI using the same logic as export
  React.useEffect(() => {
    if (props.folder.files.length === 0) {
      setImdi("");
      return;
    }

    const generator = new ImdiGenerator(
      IMDIMode.RAW_IMDI,
      props.folder,
      props.project
    );
    const xml = generator.makePseudoSessionImdiForOtherFolder(
      props.name,
      props.folder
    );
    setImdi(xml);
  }, [props.project, props.folder, props.name, props.folder.files.length]);

  // Validate the IMDI when it changes
  React.useEffect(() => {
    if (imdi) {
      const imdiSchema =
        GetOtherConfigurationSettings().imdiSchema || "IMDI_3.0.xsd";
      setSchemaName(imdiSchema);
      mainProcessApi.validateImdiAsync(imdi, imdiSchema).then((r) => {
        setValidationResult(r);
      });
    } else {
      setValidationResult(undefined);
    }
  }, [imdi]);

  if (props.folder.files.length === 0) {
    return (
      <div
        css={css`
          padding: 20px;
        `}
      >
        <Alert severity="info">
          <Trans>
            This folder has no files. Add files to see the IMDI that will be
            generated.
          </Trans>
        </Alert>
      </div>
    );
  }

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
      {validationResult?.valid && (
        <Alert severity="success">
          <Trans>This XML conforms to the IMDI schema.</Trans> ({schemaName})
        </Alert>
      )}
      {validationResult && !validationResult.valid && (
        <Alert severity="error">
          <div
            css={css`
              font-weight: bold;
              margin-bottom: 8px;
            `}
          >
            Validation failed using schema: {schemaName}
          </div>
          {validationResult?.errors.map((e, i) => {
            return (
              <div
                key={i}
                css={css`
                  margin: 0;
                  font-weight: 500;
                  white-space: pre-wrap;
                `}
              >
                {e.message}
              </div>
            );
          })}
        </Alert>
      )}
      <SearchableCodeViewer
        content={imdi}
        language="xml"
        autoFocusSearch={true}
      />
    </div>
  );
};
