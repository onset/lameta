import * as React from "react";
import { observer } from "mobx-react";
import { Field, IChoice } from "../../model/field/Field";
// tslint:disable-next-line:no-duplicate-imports
import ReactSelectClass from "react-select";
import { AuthorityLists } from "../../model/Project/AuthorityLists/AuthorityLists";
import { lameta_orange } from "../../containers/theme";
import { FieldLabel } from "../FieldLabel";
import { SearchContext } from "../SearchContext";
import HighlightSearchTerm from "../HighlightSearchTerm";
import { components } from "react-select";

export interface IProps {
  field: Field;
  authorityLists: AuthorityLists;
}

const AccessChooser: React.FC<IProps & React.HTMLAttributes<HTMLDivElement>> = (
  props
) => {
  const { searchTerm } = React.useContext(SearchContext);

  const options = props.authorityLists.accessChoicesOfCurrentProtocol.map(
    (c: IChoice) => {
      // The choice already has a human-readable label (e.g., "U: open to users")
      // which may include localized text. We use the id as the stored value
      // but display the label to the user.
      return new Object({
        value: c.id, // we store the code (e.g. "U") on disk, not the label
        label: c.label // display the full label from the vocabulary
      });
    }
  );

  let currentOption: object | null = null;
  if (props.field.text.trim().length > 0) {
    const storedValue = props.field.text;
    const matchingOption = options.find((o: any) => o.value === storedValue);
    currentOption = matchingOption
      ? matchingOption
      : {
          value: storedValue,
          label: storedValue + " <-- Invalid Access",
          title: "This value is not in the current access protocol."
        };
  }

  return (
    <div className={"field access-chooser"} data-testid="access-chooser-field">
      <FieldLabel fieldDef={props.field.definition} />
      <ReactSelectClass
        id="access-chooser" // for playwright
        className="field-value-border"
        tabIndex={props.tabIndex ? props.tabIndex : undefined}
        value={currentOption}
        placeholder=""
        onChange={(s: any) => {
          props.field.text = (s && s.value ? s.value : "") as string;
        }}
        options={options}
        components={{
          Option: (selectProps: any) => (
            <components.Option {...selectProps}>
              <HighlightSearchTerm text={selectProps.data.label} />
            </components.Option>
          ),
          SingleValue: (selectProps: any) => (
            <components.SingleValue {...selectProps}>
              <HighlightSearchTerm text={selectProps.data.label} />
            </components.SingleValue>
          )
        }}
        styles={{
          control: (styles, state) => ({
            ...styles,
            minHeight: "2em",
            height: "2em",
            border: "none",
            boxShadow: "none",
            "&:hover": {
              border: "none"
            },
            borderRadius: 0
          }),
          menu: (provided) => ({
            ...provided,
            marginTop: "0",
            marginBottom: "0"
          }),
          container: (provided) => ({
            ...provided
            //marginTop: "2px"
          }),
          valueContainer: (provided) => ({
            ...provided,
            paddingLeft: "2px",
            paddingTop: "0"
          }),
          input: (provided) => ({
            ...provided,
            height: "20px"
          }),
          indicatorsContainer: (provided) => ({
            ...provided,
            height: "26px"
          }),
          dropdownIndicator: (provided) => ({
            ...provided,
            height: "26px",
            padding: "1px"
          }),
          option: (provided, state) => ({
            ...provided,
            color: "black",
            backgroundColor: state.isFocused ? lameta_orange : "white",
            fontWeight: state.isSelected ? "bold" : "normal"
          })
        }}
      />
    </div>
  );
};

export default observer(AccessChooser);
