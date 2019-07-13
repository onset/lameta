// tslint:disable-next-line:no-duplicate-imports
import ReactSelect from "react-select";
import { default as React, useState } from "react";
import { Folder } from "../../model/Folder";
import { Contribution } from "../../model/file/File";
import { Trans } from "@lingui/react";
import { translateRole } from "../../localization";
const titleCase = require("title-case");

export interface IProps {
  folder: Folder;
  getPeopleNames: () => string[];
  onShowContributorsTab: (contributions: Contribution) => void;
}

export const PeopleChooser: React.FunctionComponent<
  IProps & React.HTMLAttributes<HTMLDivElement>
> = props => {
  const [toggle, setToggle] = useState(false);
  const customStyles = {
    control: styles => ({ ...styles, backgroundColor: "white" }),
    multiValue: styles => {
      return {
        ...styles,
        fontSize: "12pt",
        fontWeight: 600,
        border: "solid 2px #cff09f ",
        backgroundColor: "white",
        color: "lightgray" // for the "x"
      };
    }
  };

  //const label: string = props.field.labelInUILanguage;
  const choices = props.getPeopleNames().map((name, index) => {
    return new Object({
      value: "choice" + index, // only function of this is as a unique key
      contribution: new Contribution(name, "participant", "", ""),
      label: name
    });
  });

  const currentValueArray = props.folder
    .metadataFile!.contributions.filter(c => c.personReference)
    .map((c, index) => ({
      value: "existing" + index, // only function of this is as a unique key
      label: c.personReference + ":" + (c.role || ""),
      contribution: c
    }));

  const CustomLabel = ({ children, data, innerProps, isDisabled }) => {
    return !isDisabled ? (
      <div
        onClick={e => {
          e.preventDefault(); // doesn't work. Trying to prevent the list from react-select list from dropping down
          e.stopPropagation(); // doesn't work
          props.onShowContributorsTab(data.contribution);
        }}
        {...innerProps}
      >
        <div>{data.contribution.personReference}</div>
        <div className="select-contributorRole">
          {titleCase(translateRole(data.contribution.role))}
        </div>
      </div>
    ) : null;
  };

  return (
    <div className={"field " + props.className}>
      <label>
        <Trans>People</Trans>
      </label>
      <ReactSelect
        components={{ MultiValueLabel: CustomLabel }}
        styles={customStyles}
        name={"People"}
        value={currentValueArray}
        noOptionsMessage={() =>
          "Person not found. To add people, go to the People tab."
        }
        isClearable={false} // don't need the extra "x" button
        onChange={(v: any[]) => {
          // if you delete the last member, you get null instead of []
          const newChoices = v ? v : [];
          // NB: haven't worked out how to use mbox with functional components yet, so we
          // set the value
          //props.field.setValueFromString(s);
          props.folder.metadataFile!.contributions = [];
          newChoices.forEach(c => {
            props.folder.metadataFile!.contributions.push(c.contribution);
          });

          // and explicitly change the state so that we redraw
          setToggle(!toggle);
        }}
        options={choices}
        isMulti
        removeSelected={false}
      />
    </div>
  );
};
