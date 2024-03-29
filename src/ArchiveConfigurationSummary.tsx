import * as React from "react";

import {
  FieldDefinitionCustomizationDescription,
  loadAndMergeFieldChoices
} from "./model/field/ConfiguredFieldDefinitions";

// a react functional component that takes displays the diffs between the default and the merged configurations
const ArchiveConfigurationSummary: React.FunctionComponent<
  {
    chosen: string;
  } & React.HTMLAttributes<HTMLDivElement>
> = (props) => {
  const [diffs, setDiffs] = React.useState<
    FieldDefinitionCustomizationDescription[]
  >([]);

  React.useEffect(() => {
    setDiffs(loadAndMergeFieldChoices(props.chosen).diffs);
  }, [props.chosen]);

  return (
    <div>
      <h3>Changes from Default Configuration</h3>
      <h4>Additions</h4>
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
    </div>
  );
};
export { ArchiveConfigurationSummary };
