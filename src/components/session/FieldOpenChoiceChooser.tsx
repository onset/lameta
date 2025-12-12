import * as React from "react";
import { Field } from "../../model/field/Field";
import { observer } from "mobx-react";
import CreatableSelect from "react-select/creatable";
import { lameta_orange, tooltipBackground } from "../../containers/theme";
import { capitalCase } from "../../other/case";
import { OptionWithTooltip } from "../OptionWithTooltip";
import { SearchContext } from "../SearchContext";
import HighlightSearchTerm from "../HighlightSearchTerm";
import { components } from "react-select";
import { Project } from "../../model/Project/Project";
import { translateGenreToLanguage } from "../../other/localization";
import Tooltip from "react-tooltip-lite";

//const Choices = new Dictionary<string, Array<string>>();

// Build tooltip content showing translations in project's metadata language slots
const buildTranslationTooltip = (
  value: string,
  translateToLanguage: (value: string, lang: string) => string | undefined
): React.ReactNode => {
  const slots = Project.getMetadataLanguageSlots();
  if (slots.length <= 1 || !value) return null;

  const translations: { name: string; text: string }[] = [];
  for (const slot of slots) {
    const translated = translateToLanguage(value, slot.tag);
    if (translated) {
      // Use autonym if available, otherwise fall back to name
      const displayName = slot.autonym || slot.name || slot.label;
      translations.push({ name: displayName, text: translated });
    }
  }

  if (translations.length === 0) return null;

  return (
    <div>
      {translations.map((t, i) => (
        <div key={i}>
          <strong>{t.name}:</strong> {t.text}
        </div>
      ))}
    </div>
  );
};

// For fields where there are choices but the user can enter new ones.
const FieldOpenChoiceChooser: React.FunctionComponent<{
  field: Field;
  className?: string;
  tabIndex?: number;
  translateChoice: (english: string) => string;
}> = (props) => {
  const label = props.field.labelInUILanguage;
  // enhance: "complex" here means there is more than just a phrase associated with
  // this. Genres have definitions and examples too. It seems that this code is
  // conflating "open" with "complex"; we could certainly have a field where you
  // can add new things but there is no definition or examples. The code here
  // works because the only "open" chooser at the moment is for genres.
  const choices = props.field.definition.complexChoices
    ? props.field.definition.complexChoices
    : [];

  const options = choices
    .map((c) => {
      let tip = c.description || "";
      if (c.examples && c.examples.length > 0) {
        tip += "\nExamples: " + c.examples;
      }
      if (c.source) {
        tip += "\nSource: " + c.source;
      }
      return new Object({
        value: c.id,
        label: props.translateChoice(c.label),
        title: tip,
        source: c.source
      });
    })
    .sort((a: any, b: any) => (a.label as string).localeCompare(b.label));

  let currentOption: object | null = null;
  if (props.field.text.trim().length > 0) {
    const matchingOption = options.find(
      (o: any) => o.value.toLowerCase() === props.field.text.toLowerCase()
    );
    currentOption = matchingOption
      ? matchingOption
      : {
          value: props.field.text,
          label: props.field.text
        };
  }
  const { searchTerm } = React.useContext(SearchContext);
  return (
    <div className={"field " + props.className} data-testid="genre-chooser">
      <label>{label}</label>
      <CreatableSelect
        className="field-value-border"
        tabIndex={props.tabIndex ? props.tabIndex : undefined}
        //classNamePrefix="rs" // causes react-select to show you the parts of the control for styling, e.g. "rs-input"
        value={currentOption}
        placeholder=""
        /* This is a complete mystery, why I have to go in and do so much hand-styling to get a non-gargantuan react-select*/
        styles={{
          control: (provided, state) => ({
            ...provided,
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
            ...provided,
            marginTop: "2px"
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
          })
        }}
        onChange={(s: any) => {
          props.field.setValueFromString(s && s.value ? s.value : "");
        }}
        components={{
          Option: (p: any) => <OptionWithTooltip {...p} />,
          SingleValue: (p: any) => {
            const isMultilingual = props.field.definition.multilingual;
            const slots = Project.getMetadataLanguageSlots();
            const showTranslationTooltip =
              isMultilingual && slots.length > 1 && p.data.value;
            const tooltipContent = showTranslationTooltip
              ? buildTranslationTooltip(p.data.value, translateGenreToLanguage)
              : null;

            const innerContent = <HighlightSearchTerm text={p.data.label} />;

            return (
              <components.SingleValue {...p}>
                {tooltipContent ? (
                  <Tooltip
                    direction="down"
                    content={tooltipContent}
                    background={tooltipBackground}
                    color="white"
                    hoverDelay={300}
                  >
                    <span>{innerContent}</span>
                  </Tooltip>
                ) : (
                  innerContent
                )}
              </components.SingleValue>
            );
          }
        }}
        options={options}
      />
    </div>
  );
};

export default observer(FieldOpenChoiceChooser);
