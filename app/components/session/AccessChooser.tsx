import * as React from "react";
import { Trans } from "@lingui/macro";
import { observer } from "mobx-react";
import { Field } from "../../model/field/Field";
// tslint:disable-next-line:no-duplicate-imports
import ReactSelectClass from "react-select";
import { AuthorityLists } from "../../model/Project/AuthorityLists/AuthorityLists";
import { translateAccessProtocol } from "../../other/localization";
const saymore_orange = "#e69664";

export interface IProps {
  field: Field;
  authorityLists: AuthorityLists;
}

class AccessChooser extends React.Component<
  IProps & React.HTMLAttributes<HTMLDivElement>
> {
  constructor(props: IProps) {
    super(props);
  }

  public render() {
    const options = this.props.authorityLists.accessChoicesOfCurrentProtocol.map(
      (c) => {
        return new Object({
          value: c.label,
          label:
            translateAccessProtocol(c.label) +
            (c.description.length > 0
              ? ":  " + c.description // not localized yet
              : ""),
        });
      }
    );

    let currentOption: object | null = null;
    if (this.props.field.text.trim().length > 0) {
      const matchingOption = options.find(
        (o: any) => o.value === this.props.field.text
      );
      currentOption = matchingOption
        ? matchingOption
        : {
            value: this.props.field.text,
            label: this.props.field.text + " <-- Invalid Access",
            title: "This value is not in the current access protocol.",
          };
    }

    return (
      <div className={"field access-chooser"}>
        <label>
          <Trans>Access</Trans>
        </label>
        <ReactSelectClass
          name={this.props.field.labelInUILanguage}
          tabIndex={this.props.tabIndex ? this.props.tabIndex.toString() : ""}
          value={currentOption}
          placeholder=""
          onChange={(s: any) => {
            this.props.field.text = (s && s.value ? s.value : "") as string;
          }}
          options={options}
          styles={{
            control: (styles, state) => ({
              ...styles,
              minHeight: "2em",
              height: "2em",
              borderStyle: "inset",
              borderRadius: 0,
              borderColor: "rgb(169, 169, 169)",
              boxShadow: state.isFocused
                ? "0 0 0 1px " + saymore_orange
                : "unset",
              "&:hover": { borderColor: saymore_orange },
            }),
            menu: (provided) => ({
              ...provided,
              marginTop: "0",
              marginBottom: "0",
            }),
            container: (provided) => ({
              ...provided,
              marginTop: "2px",
            }),
            valueContainer: (provided) => ({
              ...provided,
              paddingLeft: "2px",
              paddingTop: "0",
            }),
            input: (provided) => ({
              ...provided,
              height: "20px",
            }),
            indicatorsContainer: (provided) => ({
              ...provided,
              height: "26px",
            }),
            dropdownIndicator: (provided) => ({
              ...provided,
              height: "26px",
              padding: "1px",
            }),
            option: (provided, state) => ({
              ...provided,
              color: "black",
              backgroundColor: state.isFocused ? saymore_orange : "white",
              fontWeight: state.isSelected ? "bold" : "normal",
            }),
          }}
        />
      </div>
    );
  }
}

export default observer(AccessChooser);
