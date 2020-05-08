import * as React from "react";
import { observer } from "mobx-react";
// tslint:disable-next-line: no-submodule-imports
import CreatableSelect from "react-select/creatable";
//import colors from "..//../colors.scss"; // this will fail if you've touched the scss since last full webpack build

const saymore_orange = "#e69664";

export interface IProps {
  name: string;
  getPeopleNames: () => string[];
  onChange: (name: string) => void;
  highlight: boolean;
}

@observer
export default class PersonChooser extends React.Component<IProps> {
  constructor(props: IProps) {
    super(props);
  }

  public render() {
    const customStyles = {
      container: (styles, { data }) => {
        return {
          ...styles,
          border: this.props.highlight ? "solid 2px " + saymore_orange : "none",
        };
      },
    };

    //console.log("person name: " + JSON.stringify(this.props.name));
    const choices = this.props.getPeopleNames().map((c) => {
      return new Object({
        value: c,
        label: c,
      });
    });
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
        new Object({ value: this.props.name, label: this.props.name })
      );
    }
    return (
      //<ReactSelect <-- if we didn't want to allow new
      <CreatableSelect
        name={this.props.name}
        styles={customStyles}
        value={{ value: this.props.name, label: this.props.name }}
        onChange={(v: any) => {
          const s: string = v.value;
          this.props.onChange(s ? s : "");
        }}
        options={choices}
      />
    );
  }
}
