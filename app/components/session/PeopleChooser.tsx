import * as React from "react";
import { observer } from "mobx-react";
import { Field } from "../../model/field/Field";
// tslint:disable-next-line:no-duplicate-imports
import ReactSelect from "react-select";
import { useState } from "react";
import { Folder } from "../../model/Folder";
import { Contribution } from "../../model/file/File";
import { Trans } from "@lingui/react";

export interface IProps {
  folder: Folder;
  getPeopleNames: () => string[];
}

export const PeopleChooser: React.FunctionComponent<
  IProps & React.HTMLAttributes<HTMLDivElement>
> = props => {
  const [toggle, setToggle] = useState(false);
  const peopleColor = "#becde4";
  const customStyles = {
    control: styles => ({ ...styles, backgroundColor: "white" }),
    multiValue: styles => {
      return {
        ...styles,
        fontSize: "12pt",
        fontWeight: 600,
        border: "solid thin " + peopleColor,
        backgroundColor: "white",
        color: "lightgray" // for the "x"
      };
    }
  };

  //const label: string = props.field.labelInUILanguage;
  const choices = props.getPeopleNames().map(c => {
    return new Object({
      value: { name: c, role: "participant", comments: "" },
      label: c
    });
  });

  const currentValueArray = props.folder
    .metadataFile!.contributions.filter(c => c.personReference)
    .map(c => ({
      value: { name: c.personReference, role: c.role, comments: c.comments }, // the role in the value is to avoid the react error where the keys are the same
      label: c.personReference + ":" + (c.role || "")
    }));

  return (
    <div className={"field " + props.className}>
      <label>
        <Trans>People</Trans>
      </label>
      <ReactSelect
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
            props.folder.metadataFile!.contributions.push(
              new Contribution(c.value.name, c.value.role, "", c.value.comments)
            );
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
