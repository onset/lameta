import * as React from "react";
import { css } from "@emotion/react";
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
      {projectCustomizations.length > 0 ||
      sessionCustomizations.length > 0 ||
      personCustomizations.length > 0 ? (
        <div css={sectionBoxStyle}>
          <h3>Field Changes</h3>
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
              : "None"}
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
              : "None"}
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
              : "None"}
          </ul>
        </div>
      ) : null}
      {props.configurationChoice.extra &&
        Object.entries(props.configurationChoice.extra).length > 0 && (
          <div css={sectionBoxStyle}>
            <h3>User Interface</h3>
            {Object.entries(props.configurationChoice.extra).map(
              (setting: [string, any]) => (
                <li key={setting[0]}>{`${setting[0]}: ${setting[1]}`}</li>
              )
            )}
          </div>
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

  // Visibility
  const factoryVisibility = factory.visibility || "always";
  if (factoryVisibility !== newDef.visibility) {
    if (factory.visibility === "never" && newDef.visibility === "always")
      diffs.push(<span>{`+${label}`}</span>);
    else if (factoryVisibility === "always" && newDef.visibility === "never")
      diffs.push(
        <span style={{ textDecoration: "line-through" }}>{label}</span>
      );
    else
      diffs.push(
        <span>
          {`${label} visibility changed from ${factoryVisibility} to ${newDef.visibility}`}{" "}
        </span>
      );
  }
  // Description
  if (factory.description !== newDef.description) {
    diffs.push(
      <span>
        {`${label} description changed from ${
          factory.description || "(empty)"
        } to "${newDef.description}"`}
      </span>
    );
  }
  // Multilingualism
  if (factory.multilingual !== newDef.multilingual) {
    diffs.push(
      <span key={`${label}-${diffs.length}`}>
        {`${label} multilingual changed from ${factory.multilingual} to ${newDef.multilingual}`}
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
