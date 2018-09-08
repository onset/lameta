import * as React from "react";
import ReactModal from "react-modal";
import "./LanguagePickerDialog.scss";
import CloseOnEscape from "react-close-on-escape";
import Autosuggest from "react-autosuggest";

// tslint:disable-next-line:no-empty-interface
interface IProps {}
interface IState {
  isOpen: boolean;
  isoCode: string;
  suggestions: any[];
  //topSuggestion: any;
}

const iso6392List = require("iso-639-2");

export default class LanguagePickerDialog extends React.Component<
  IProps,
  IState
> {
  private static singleton: LanguagePickerDialog;

  constructor(props: IProps) {
    super(props);
    this.state = {
      isOpen: false,
      isoCode: "",
      suggestions: []
      //topSuggestion: {}
    };
    LanguagePickerDialog.singleton = this;
  }
  private handleCloseModal(doDelete: boolean) {
    this.setState({ isOpen: false });
  }

  public static async show(codeThenColonThenName: string) {
    let isoCode = "";
    const parts = codeThenColonThenName.split(":");

    if (parts.length === 2) {
      isoCode = parts[0];
    }
    LanguagePickerDialog.singleton.setState({
      isoCode,
      isOpen: true
    });
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

    const suggestions =
      inputLength === 0
        ? []
        : iso6392List.filter(
            lang =>
              lang.name.toLowerCase().slice(0, inputLength) === inputValue ||
              lang.iso6392B === inputValue
          );

    return suggestions;
  }
  public render() {
    const suggestions = this.state.suggestions;
    const topSuggestionCode =
      suggestions.length > 0 ? suggestions[0].iso6392B : "";
    const value = this.state.isoCode;
    const inputProps = {
      placeholder: "Type language name",
      value,
      onChange: (event, { newValue }) => this.setState({ isoCode: newValue }),
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
          <div className={"dialogTitle"}>Choose Language</div>
          <div className="dialogContent">
            <div className="picker">
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
                      suggestion.iso6392B === topSuggestionCode
                        ? "selected"
                        : ""
                    }
                  >
                    <span className="code">{`${suggestion.iso6392B}`}</span>
                    {`${suggestion.name}`}
                  </div>
                )}
                alwaysRenderSuggestions={true}
                shouldRenderSuggestions={() => true}
                inputProps={inputProps}
              />
            </div>
            <div className={"bottomButtonRow"}>
              <div className={"okCancelGroup"}>
                <button onClick={() => this.handleCloseModal(false)}>
                  Cancel
                </button>
                <button
                  id="okButton"
                  onClick={() => this.handleCloseModal(true)}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </ReactModal>
      </CloseOnEscape>
    );
  }
}
