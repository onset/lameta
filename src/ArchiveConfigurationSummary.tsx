import * as React from "react";

import {
  FieldDefinitionCustomizationRecord,
  loadAndMergeFieldChoices
} from "./model/field/ConfiguredFieldDefinitions";
import { FieldDefinition } from "./model/field/FieldDefinition";

import accessProtocols from "./model/Project/AuthorityLists/AccessProtocols/AccessProtocols.json";

// a react functional component that takes displays the diffs between the default and the merged configurations
const ArchiveConfigurationSummary: React.FunctionComponent<
  {
    configurationName: string;
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

  return (
    <div>
      <h2>Access Protocols</h2>
      <ul>
        {accessProtocols
          .find((p) => p.protocol == props.configurationName)!
          .choices.map((choice) => (
            <li key={choice.label}>
              {choice.label} {choice.description}
            </li>
          ))}
      </ul>
      <h2>Field Changes</h2>
      <h3>Project</h3>
      <ul>
        {customizations
          .filter((c) => c.area === "project")
          .map((customization) => (
            <>
              {describeChange(
                customization.area,
                customization.factoryDefinition,
                customization.newDefinition
              )}
            </>
          ))}
      </ul>
      <h3>Session</h3>
      <ul>
        {customizations
          .filter((c) => c.area === "session")
          .map((customization) => (
            <>
              {describeChange(
                customization.area,
                customization.factoryDefinition,
                customization.newDefinition
              )}
            </>
          ))}
      </ul>
      <h3>Person</h3>
      <ul>
        {customizations
          .filter((c) => c.area === "person")
          .map((customization) => (
            <>
              {describeChange(
                customization.area,
                customization.factoryDefinition,
                customization.newDefinition
              )}
            </>
          ))}
      </ul>
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
      <span>
        {`${label} multilingual changed from ${factory.multilingual} to ${newDef.multilingual}`}
      </span>
    );
  }
  return (
    <React.Fragment>
      {diffs.map((diff) => (
        <div>{diff}</div>
      ))}
    </React.Fragment>
  );
}
/*
 // look at every field in the customization and see if it is different from the factory definition
            // for each difference, add an entry to the diffs array
            for (const key of Object.keys(entry)) {
              if (entry[key] !== factoryDefinition[key]) {
                // if  factoryDefinition.visibility undefined or "never" and entry changes it to always, that's an "addition"
                if (
                  factoryDefinition.visibility === "never" &&
                  entry.visibility === "always"
                ) {
                  diffs.push({
                    factoryDefinition,
                    area,
                    change: "addition",
                    message: `addded ${key}`
                  });
                }
                // if factoryDefinition.visibility is "always" and entry changes it to "never", that's a "removal"
                else if (
                  factoryDefinition.visibility !== "never" &&
                  entry.visibility === "never"
                ) {
                  diffs.push({
                    area,
                    factoryDefinition,
                    change: "removal",
                    message: `removed ${key}`
                  });
                } else {
                  diffs.push({
                    area,
                    factoryDefinition,
                    change: "other",
                    message: `${area} ${factoryDefinition.englishLabel} changed from ${factoryDefinition[key]} to ${entry[key]}`
                  });
                }
              }
            }
            */

/*
            <ul>
        {diffs
          .filter((diff) => diff.change === "addition")
          .map((diff) => (
            <li key={diff.area + diff.factoryDefinition.key}>
              {diff.area} {diff.factoryDefinition.englishLabel}
            </li>
          ))}
      </ul>
      <h4>Removals</h4>
      <ul>
        {diffs
          .filter((diff) => diff.change === "removal")
          .map((diff) => (
            <li key={diff.factoryDefinition.key}>
              {diff.factoryDefinition.englishLabel}
            </li>
          ))}
      </ul>
      <h4>Other</h4>
      <ul>
        {diffs
          .filter((diff) => diff.change === "other")
          .map((diff) => (
            <li key={diff.factoryDefinition.key}>{diff.message}</li>
          ))}
      </ul>
      */
