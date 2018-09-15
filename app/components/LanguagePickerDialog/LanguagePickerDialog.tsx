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
    const suggestions = this.state.suggestions;
    const topSuggestionCode =
      suggestions.length > 0 ? suggestions[0].code.three : "";
    const value = this.state.isoCode;
    const inputProps = {
      placeholder: "Type language name or code",
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
