import * as React from "react";
import { css } from "@emotion/react";
import { Project } from "../../model/Project/Project";
import ImdiGenerator, { IMDIMode } from "../../export/ImdiGenerator";
import ImdiBundler from "../../export/ImdiBundler";
import { mainProcessApi } from "../../mainProcess/MainProcessApiAccess";
import { XMLValidationResult } from "xmllint-wasm";
import Alert from "@mui/material/Alert";
import { Trans } from "@lingui/macro";
import { GetOtherConfigurationSettings } from "../../model/Project/OtherConfigurationSettings";
import { SearchableCodeViewer } from "../SearchableCodeViewer";

interface IProps {
  project: Project;
}

/**
 * Shows the IMDI that would be generated for the ConsentDocuments bundle.
 *
 * This mirrors what ImdiBundler.generateConsentBundleData does during export.
 * The consent bundle gathers all consent files from persons who contributed
 * to sessions in the project.
 */
export const ConsentImdiView: React.FunctionComponent<IProps> = (props) => {
  const [imdi, setImdi] = React.useState<string>("");
  const [validationResult, setValidationResult] =
    React.useState<XMLValidationResult | undefined>();
  const [schemaName, setSchemaName] = React.useState<string>("IMDI_3.0.xsd");

  // Generate the IMDI for consent documents using the shared helper
  React.useEffect(() => {
    const { session, tempDir, hasConsentFiles } =
      ImdiBundler.createConsentBundleSession(props.project);

    if (!hasConsentFiles) {
      setImdi("");
      ImdiBundler.cleanupConsentBundleTempDir(tempDir);
      return;
    }

    // Generate the IMDI using the same logic as export
    const xml = ImdiGenerator.generateSession(
      IMDIMode.RAW_IMDI,
      session,
      props.project
    );
    setImdi(xml);

    ImdiBundler.cleanupConsentBundleTempDir(tempDir);
  }, [props.project, props.project.sessions.items.length]);

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
