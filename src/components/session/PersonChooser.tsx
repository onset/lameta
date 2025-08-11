import * as React from "react";
import { observer } from "mobx-react";
import CreatableSelect from "react-select/creatable";
import { components } from "react-select";
import { IChoice } from "../../model/field/Field";
import { capitalCase } from "../../other/case";
import { SearchContext } from "../SearchContext";
import HighlightSearchTerm from "../HighlightSearchTerm";
//import colors from "..//../colors.scss"; // this will fail if you've touched the scss since last full webpack build

const saymore_orange = "#e69664";

export interface IProps {
  name: string;
  getPeopleNames: () => IChoice[];
  onChange: (name: string) => void;
  highlight: boolean;
}

class PersonChooser extends React.Component<IProps> {
  static contextType = SearchContext;
  constructor(props: IProps) {
    super(props);
  }

  public render() {
    const searchTerm = (this.context && (this.context as any).searchTerm) || "";
    const customStyles = {
      container: (styles: any) => {
        return {
          ...styles,
          border: this.props.highlight ? "solid 2px " + saymore_orange : "none"
        };
      }
    };

    //console.log("person name: " + JSON.stringify(this.props.name));
    const choices: IChoice[] = this.props
      .getPeopleNames()
      .map((c) => {
        //console.log("c: " + JSON.stringify(c));
        return new Object({
          value: c.label,
          label: c.description ? `${c.label} ${c.description}` : c.label
          // enhance: when Project creates this list, it puts a note in the description
          // for names that are just names and not full Person records.
          // We would like to do more than just append that, do some styling.
          // However the react-select component doesn't have a way to do that, but we could use something
          // else. The harder part is keeping it up to date as people records are added or removed.
        }) as IChoice;
      })
      .sort((a: any, b: any) => a.label.localeCompare(b.label));
    /* Question: Should we allow contributors that we don't have a "Person" (Actor) record for?
      SayMore Classic does as of 2017. So we have to support data incoming that way. 
      But it's a separate question of whether we want to allow new contributors that don't have
      people records. */
    if (
      this.props.name &&
      choices.filter((c: any) => c.label === this.props.name).length === 0
    ) {
      //console.log(`${this.props.name} was not in the list of people choices.`);
      choices.push(
        new Object({
          value: this.props.name,
          label: this.props.name
        }) as IChoice
      );
    }
    // remove any duplicates where the values are the same
    const seen: any = {};
    const unique = choices.filter((item: any) => {
      return Object.prototype.hasOwnProperty.call(seen, item.value)
        ? false
        : (seen[item.value] = true);
    });

    const person = choices.find((c: any) => c.value === this.props.name);
    const labelText = person ? person.label : this.props.name;
    const highlightLabel = () => {
      if (!searchTerm) return labelText;
      const lower = labelText.toLowerCase();
      const i = lower.indexOf(searchTerm);
      if (i === -1) return labelText;
      return (
        <>
          {labelText.substring(0, i)}
          <mark
            data-testid="inline-highlight"
            style={{ background: "#ffba8a", padding: "0 1px" }}
          >
            {labelText.substring(i, i + searchTerm.length)}
          </mark>
          {labelText.substring(i + searchTerm.length)}
        </>
      );
    };
    return (
      //<ReactSelect <-- if we didn't want to allow new
      <CreatableSelect
        className="PersonChooser"
        name={this.props.name}
        styles={customStyles}
        value={{
          value: this.props.name,
          label: labelText
        }}
        onChange={(v: any) => {
          // ELAR does not want this
          // const s: string = capitalCase(v.value);
          // this.props.onChange(s ? s : "");
          this.props.onChange(v.value);
        }}
        options={unique}
        // this is what shows if you start typing, see it until you type a match of a person
        formatCreateLabel={(inputValue: string) => {
          return `${inputValue} ❓`;
        }}
        components={{
          SingleValue: (props: any) => (
            <components.SingleValue {...props}>
              {highlightLabel()}
            </components.SingleValue>
          )
        }}
      />
    );
  }
}

export default observer(PersonChooser);
