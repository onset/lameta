import * as React from "react";
import { Trans } from "@lingui/macro";
import ReactModal from "react-modal";
import "./LanguagePickerDialog.css";
import CloseOnEscape from "react-close-on-escape";
import Autosuggest from "react-autosuggest";
import { Field } from "../../model/field/Field";

// tslint:disable-next-line:no-empty-interface
interface IProps {}
interface IState {
  isOpen: boolean;
  field: Field | undefined;
  langCode: string;
  name: string;
  suggestions: any[];
  //topSuggestion: any;
}

// !!!!!!!!!!!!!!!!!!!!!!!!!!
// This dialog started out wanting to be a full-fledged language lookup system, and it also needs
// to guide people to dealing with languages we don't know about, either because our index is out of
// date or because the language doesn't have an iso code yet. But I had to put that stuff and hold
// and dumb it down to a simple dumb form. That explains all the unused code... we will return to this.
export default class LanguagePickerDialog extends React.Component<
  IProps,
  IState
> {
  private static singleton: LanguagePickerDialog;
  constructor(props: IProps) {
    super(props);
    this.state = {
      isOpen: false,
      field: undefined,
      langCode: "",
      name: "",
      suggestions: []
      //topSuggestion: {}
    };
    LanguagePickerDialog.singleton = this;
  }
  private handleCloseModal(doSave: boolean) {
    if (doSave && this.state.field) {
      this.state.field.setValueFromString(
        this.state.langCode + " : " + this.state.name
      );
    }
    this.setState({ isOpen: false });
  }

  public static async show(field: Field) {
    if (!field.text || field.text.trim().length === 0) {
      LanguagePickerDialog.singleton.change({
        field,
        langCode: "",
        name: "",
        isOpen: true
      });
      return;
    }
    // granted, this format is wierd... it comes form a legacy SayMore-windows implementation,
    // which combined the code and name into a single value rather than splitting them up
    const codeThenColonThenName = field.text;
    const parts = codeThenColonThenName.split(":");
    if (parts.length === 2) {
      LanguagePickerDialog.singleton.change({
        field,
        langCode: parts[0].trim(),
        name: parts[1].trim(),
        isOpen: true
      });
    } else {
      alert(`Could not parse code and language: '${field.text}'`);
    }
  }
  private change(stateChange: any) {
    this.setState(stateChange);
  }

  private onSuggestionsFetchRequested({ value }) {
    this.setState({
      suggestions: this.getSuggestions(value)
    });
  }
  private onSuggestionsClearRequested() {
    this.setState({
      suggestions: []
    });
  }
  private getSuggestions(value) {
    const inputValue = value.trim().toLowerCase();
    const inputLength = inputValue.length;

    const suggestions = [];
    // inputLength === 0
    //   ? []
    //   : languageIndex.filter(
    //       lang =>
    //         // case and diacritic insensitive
    //         lang.name
    //           .slice(0, inputLength)
    //           .localeCompare(inputValue, undefined, {
    //             sensitivity: "base"
    //           }) ||
    //         lang.code.two === inputValue ||
    //         lang.code.three === inputValue ||
    //         lang.altNames.find(alt =>
    //           alt.localeCompare(inputValue, undefined, {
    //             sensitivity: "base"
    //           })
    //         )
    //     );

    return suggestions;
  }
  public render() {
    const codePattern = /^[a-zA-Z]{2,3}(-[a-zA-Z]{2,3})?$/;
    const haveValidFields =
      codePattern.test(this.state.langCode) && this.state.name.length > 0;
    const suggestions = this.state.suggestions;
    const topSuggestionCode =
      suggestions.length > 0 ? suggestions[0].code.three : "";
    const value = this.state.langCode;
    const inputProps = {
      placeholder: "Type language name or code",
      value,
      onChange: (event, { newValue }) => this.setState({ langCode: newValue }),
      autoFocus: true
    };
    return (
      <CloseOnEscape
        onEscape={() => {
          this.handleCloseModal(false);
        }}
      >
        <ReactModal
          ariaHideApp={false}
          className="languagePickerDialog"
          isOpen={this.state.isOpen}
          shouldCloseOnOverlayClick={true}
          onRequestClose={() => this.handleCloseModal(false)}
        >
          <div className={"dialogTitle"}>
            <Trans>Choose Language</Trans>
          </div>
          <div className="dialogContent">
            <label>
              <Trans>Language Code</Trans>
            </label>
            <input
              className="codeEntry"
              type="text"
              value={this.state.langCode}
              onChange={(e) => this.change({ langCode: e.target.value })}
            />
            <label>
              <Trans>Name</Trans>
            </label>
            <input
              className="name"
              type="text"
              value={this.state.name}
              onChange={(e) => this.change({ name: e.target.value })}
            />
            {/* <div className="picker">
              <Autosuggest
                suggestions={suggestions}
                onSuggestionsFetchRequested={p =>
                  this.onSuggestionsFetchRequested(p)
                }
                onSuggestionsClearRequested={() =>
                  this.onSuggestionsClearRequested()
                }
                getSuggestionValue={suggestion => suggestion.name}
                renderSuggestion={suggestion => (
                  <div
                    className={
                      suggestion.code.three === topSuggestionCode
                        ? "selected"
                        : ""
                    }
                  >
                    <span className="code">{`${suggestion.code.three}`}</span>
                    {`${suggestion.name}`}
                  </div>
                )}
                alwaysRenderSuggestions={true}
                shouldRenderSuggestions={() => true}
                inputProps={inputProps}
              />
            </div> */}
          </div>
          <div className={"bottomButtonRow"}>
            <div className={"reverseOrderOnMac"}>
              <button
                id="okButton"
                disabled={!haveValidFields}
                onClick={() => this.handleCloseModal(true)}
              >
                <Trans>OK</Trans>
              </button>
              <button onClick={() => this.handleCloseModal(false)}>
                <Trans>Cancel</Trans>
              </button>
            </div>
          </div>
        </ReactModal>
      </CloseOnEscape>
    );
  }
}
