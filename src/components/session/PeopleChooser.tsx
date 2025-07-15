import ReactSelect, { MultiValueProps } from "react-select";
import { Trans } from "@lingui/macro";
import { default as React, useState } from "react";
import { Folder } from "../../model/Folder/Folder";
import { Contribution } from "../../model/file/File";
import { translateRole } from "../../other/localization";
import { titleCase } from "title-case";
import { IChoice } from "../../model/field/Field";
//import colors from "../../colors.scss"; // this will fail if you've touched the scss since last full webpack build
const saymore_orange = "#e69664";

export interface IProps {
  folder: Folder;
  getPeopleNames: () => IChoice[];
  onShowContributorsTab: (contributions: Contribution) => void;
}

export const PeopleChooser: React.FunctionComponent<
  IProps & React.HTMLAttributes<HTMLDivElement>
> = (props) => {
  const [toggle, setToggle] = useState(false);
  const customStyles = {
    control: (styles, state) => ({
      ...styles,
      borderStyle: "inset",
      borderRadius: 0,
      borderColor: "rgb(169, 169, 169)",
      boxShadow: state.isFocused ? "0 0 0 1px " + saymore_orange : "unset",
      "&:hover": { borderColor: saymore_orange }
    }),
    multiValue: (styles) => {
      return {
        ...styles,

        fontWeight: 600,
        border: "solid 2px #cff09f ",
        backgroundColor: "white",
        color: "lightgray", // for the "x"
        ":hover": {
          borderColor: saymore_orange,
          cursor: "pointer"
        }
      };
    },

    multiValueRemove: (styles, { data }) => ({
      ...styles,
      //color: "white",
      ":hover": {
        backgroundColor: saymore_orange,
        color: "white"
      }
    })
  };

  //const label: string = props.field.labelInUILanguage;
  const choices = props.getPeopleNames().map((choice, index) => {
    return new Object({
      value: "choice" + index, // only function of this is as a unique key
      contribution: new Contribution(choice.label, "participant", ""),
      label: choice
    });
  });

  const currentValueArray = props.folder
    .metadataFile!.contributions.filter((c) => c.personReference)
    .map((c, index) => ({
      value: "existing" + index, // only function of this is as a unique key
      label: c.personReference + ":" + (c.role || ""),
      contribution: c
    }));

  interface PersonAndRoleOption {
    value: string;
    label: string | IChoice;
    contribution: Contribution;
  }

  const PersonAndRolePill = ({
    children,
    data,
    innerProps,
    isDisabled
  }: MultiValueProps<PersonAndRoleOption>) => {
    return (
      <div
        onClick={(e) => {
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
    );
  };

  return (
    <div className={"field " + props.className}>
      <label>
        <Trans>People</Trans>
      </label>
      <ReactSelect
        components={{ MultiValueLabel: PersonAndRolePill }}
        styles={customStyles}
        name={"People"}
        placeholder=""
        value={currentValueArray}
        noOptionsMessage={() =>
          "Person not found. To add people, go to the People tab."
        }
        isClearable={false} // don't need the extra "x" button
        onChange={(v: any[]) => {
          // if you delete the last member, you get null instead of []
          const newChoices = v ? v : [];
          // NB: haven't worked out how to use mobx with functional components yet, so we
          // set the value
          //props.field.setValueFromString(s);
          props.folder.metadataFile!.contributions = [];
          newChoices.forEach((c) => {
            props.folder.metadataFile!.contributions.push(c.contribution);
          });

          // and explicitly change the state so that we redraw
          setToggle(!toggle);
        }}
        options={choices}
        isMulti
      />
    </div>
  );
};
