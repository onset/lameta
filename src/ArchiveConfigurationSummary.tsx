import * as React from "react";
import { css } from "@emotion/react";
import { Trans } from "@lingui/macro";
import {
  FieldDefinitionCustomizationRecord,
  loadAndMergeFieldChoices
} from "./model/field/ConfiguredFieldDefinitions";
import { FieldDefinition } from "./model/field/FieldDefinition";
import { AuthorityLists } from "./model/Project/AuthorityLists/AuthorityLists";
import { IChoice } from "./model/field/Field";

// a react functional component that takes displays the diffs between the default and the merged configurations
const ArchiveConfigurationSummary: React.FunctionComponent<
  {
    configurationName: string;
    configurationChoice: IChoice;
    authorityLists: AuthorityLists;
  } & React.HTMLAttributes<HTMLDivElement>
> = (props) => {
  const [customizations, setCustomizations] = React.useState<
    FieldDefinitionCustomizationRecord[]
  >([]);

  React.useEffect(() => {
    setCustomizations(
      loadAndMergeFieldChoices(props.configurationName).customizations
    );
  }, [props.configurationName]);
  const projectCustomizations = customizations.filter(
    (c) => c.area === "project"
  );
  const sessionCustomizations = customizations.filter(
    (c) => c.area === "session"
  );
  const personCustomizations = customizations.filter(
    (c) => c.area === "person"
  );
  console.log("****", props.configurationName);

  const currentConfiguration: { choices: IChoice[] } | undefined =
    props.authorityLists.accessProtocolLists.find(
      (p) => p.archiveConfigurationName == props.configurationName
    );

  if (!currentConfiguration) {
    return <div>Configuration not found</div>;
  }
  const sectionBoxStyle = css`
    border: solid thin;
    border-radius: 4px;
    background-color: white;
    padding: 10px;
    border-color: #0000005e;
  `;
  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        gap: 10px;
        li {
          // don't show a bullet point
          list-style-type: none;
        }
      `}
    >
      <div css={sectionBoxStyle}>
        <h3
          css={css`
            margin-block-end: 1em;
          `}
        >
          Session Access Choices
        </h3>
        <ul
          css={css`
            li {
              margin-bottom: 1em;
            }
          `}
        >
          {currentConfiguration.choices.map((choice) => (
            <li key={choice.label}>
              <div>
                <b>{choice.label}</b>
              </div>
              {choice.description}
            </li>
          ))}
        </ul>
      </div>
      {/* About section commented out
      {props.configurationChoice.extra &&
        Object.entries(props.configurationChoice.extra).filter(
          ([key]) => key !== "archiveUsesImdi"
        ).length > 0 && (
          <div css={sectionBoxStyle}>
            <h3>About</h3>
            {props.configurationChoice.extra.url && (
              <li key="url">{props.configurationChoice.extra.url}</li>
            )}
            {Object.entries(props.configurationChoice.extra)
              .filter(([key]) => key !== "url" && key !== "archiveUsesImdi")
              .map((setting: [string, any]) => {
                const [key, value] = setting;
                if (key === "description") {
                  return <li key={key}>{value}</li>;
                }
                return <li key={key}>{`${key}: ${value}`}</li>;
              })}
          </div>
        )}
      */}
      {(projectCustomizations.length > 0 ||
        sessionCustomizations.length > 0 ||
        personCustomizations.length > 0 ||
        props.configurationChoice.extra?.archiveUsesImdi !== undefined) && (
        <details
          css={css`
            margin-top: 3em;
            summary {
              cursor: pointer;
              font-size: 1.17em;
              margin-bottom: 0.5em;
            }
            h4 {
              margin-block-start: 0.5em;
              margin-block-end: 0.25em;
            }
            ul {
              margin-block-start: 0;
              margin-block-end: 0;
            }
          `}
        >
          <summary>
            <Trans>Field Changes</Trans>
          </summary>

          <h4>Project</h4>
          <ul>
            {projectCustomizations.length > 0
              ? projectCustomizations.map((customization) => (
                  <div
                    key={
                      customization.area +
                      customization.factoryDefinition.englishLabel
                    }
                  >
                    {describeChange(
                      customization.area,
                      customization.factoryDefinition,
                      customization.newDefinition
                    )}
                  </div>
                ))
              : "There are no changes in this section."}
          </ul>
          <h4>Session</h4>
          <ul>
            {sessionCustomizations.length > 0
              ? sessionCustomizations.map((customization) => (
                  <>
                    {describeChange(
                      customization.area,
                      customization.factoryDefinition,
                      customization.newDefinition
                    )}
                  </>
                ))
              : "There are no changes in this section."}
          </ul>
          <h4>Person</h4>
          <ul>
            {personCustomizations.length > 0
              ? personCustomizations.map((customization) => (
                  <>
                    {describeChange(
                      customization.area,
                      customization.factoryDefinition,
                      customization.newDefinition
                    )}
                  </>
                ))
              : "There are no changes in this section."}
          </ul>
          {props.configurationChoice.extra?.archiveUsesImdi !== undefined && (
            <>
              <h4>Export Settings</h4>
              <ul>
                <li>
                  archiveUsesImdi:{" "}
                  {String(props.configurationChoice.extra.archiveUsesImdi)}
                </li>
              </ul>
            </>
          )}
        </details>
      )}
    </div>
  );
};
export { ArchiveConfigurationSummary };

function describeChange(
  area: string,
  factory: FieldDefinition,
  newDef: FieldDefinition
): React.ReactNode {
  const diffs: React.ReactNode[] = [];
  const label = `${factory.englishLabel}`;

  // Helper to convert visibility values to user-friendly text
  const visibilityToText = (v: string | undefined): string => {
    if (v === "always" || v === undefined) return "visible";
    if (v === "never") return "hidden";
    return v; // for any other values like "advanced", keep as-is
  };

  // Visibility
  const factoryVisibility = factory.visibility || "always";
  const newDefVisibility = newDef.visibility || "always";
  if (factoryVisibility !== newDefVisibility) {
    if (factoryVisibility === "never" && newDefVisibility === "always")
      diffs.push(
        <span>{`The ${label} field, which is normally hidden, will be shown.`}</span>
      );
    else if (factoryVisibility === "always" && newDefVisibility === "never")
      diffs.push(
        <span>{`The ${label} field, which is normally shown, will be hidden.`}</span>
      );
    else
      diffs.push(
        <span>
          {`The ${label} field, which is normally ${visibilityToText(
            factoryVisibility
          )}, will be ${visibilityToText(newDefVisibility)}.`}
        </span>
      );
  }
  // Description
  if (factory.description !== newDef.description) {
    diffs.push(
      <span>
        {`The description of the ${label} field, normally ${
          factory.description ? `"${factory.description}"` : "empty"
        }, will be "${newDef.description}".`}
      </span>
    );
  }
  // Multilingualism
  if (factory.multilingual !== newDef.multilingual) {
    diffs.push(
      <span key={`${label}-${diffs.length}`}>
        {`The ${label} field, which is normally ${
          factory.multilingual ? "multilingual" : "single-language"
        }, will be ${
          newDef.multilingual ? "multilingual" : "single-language"
        }.`}
      </span>
    );
  }
  return (
    <React.Fragment>
      {diffs.map((diff, index) => (
        <div key={index}>{diff}</div>
      ))}
    </React.Fragment>
  );
}
