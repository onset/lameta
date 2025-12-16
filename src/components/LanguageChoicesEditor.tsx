import { Field } from "../model/field/Field";
// tslint:disable-next-line: no-submodule-imports
import AsyncSelect from "react-select/async";
import CreatableAsyncSelect from "react-select/async-creatable";
import { default as React, useCallback } from "react";
import { Language, LanguageFinder } from "../languageFinder/LanguageFinder";
//import colors from "../colors.scss"; // this will fail if you've touched the scss since last full webpack build
import _ from "lodash";
import { LanguagePill, LanguageOption } from "./LanguagePill";
import { observer } from "mobx-react";
import { css } from "@emotion/react";
import {
  SortableContainer,
  SortableElement,
  SortableHandle
} from "react-sortable-hoc";
import arrayMove from "array-move";
import { components } from "react-select";
// @ts-ignore
import dragIcon from "@assets/drag-affordance.svg";
import { lameta_orange } from "../containers/theme";

// Drag handle for reordering language pills
const DragHandle = SortableHandle(() => (
  <div
    css={css`
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px 2px;
      cursor: grab;
      user-select: none;
    `}
  >
    <img
      src={dragIcon}
      css={css`
        height: 10px;
        opacity: 0.4;
      `}
    />
  </div>
));

// Sortable wrapper for individual multi-value items
const SortableMultiValue = SortableElement((props: any) => {
  // We need to render the original MultiValue from react-select
  // but wrap it with our sortable element
  const { innerProps, ordered, displayIndex, ...otherProps } = props;

  return (
    <div
      css={css`
        display: flex;
        align-items: center;
        &:hover img {
          opacity: 1;
        }
      `}
    >
      {ordered && (
        <>
          <DragHandle />
          <span
            css={css`
              font-size: 11px;
              color: #666;
              margin-right: 2px;
              font-weight: 500;
            `}
          >
            {displayIndex}.
          </span>
        </>
      )}
      <components.MultiValue {...otherProps} innerProps={innerProps} />
    </div>
  );
});

// Container for all sortable multi-value items
const SortableMultiValueContainer = SortableContainer(
  ({ children }: { children: React.ReactNode }) => {
    return (
      <div
        css={css`
          display: inline-flex;
          flex-direction: row;
          flex-wrap: wrap;
          align-items: center;
          gap: 2px;
        `}
      >
        {children}
      </div>
    );
  }
);

export interface IProps {
  field: Field;
  languageFinder: LanguageFinder;
  canCreateNew?: boolean; // comes in via definition.controlProps
  ordered?: boolean; // when true, show drag handles and numbers for reordering
}

// the React.HTMLAttributes<HTMLDivElement> allows the use of "className=" on these fields
export const LanguageChoicesEditor: React.FunctionComponent<
  IProps & React.HTMLAttributes<HTMLDivElement>
> = observer((props) => {
  const customStyles = {
    control: (styles, state) => ({
      ...styles,
      height: "100%",
      border: "none",
      boxShadow: "none",
      "&:hover": {
        border: "none"
      },
      borderRadius: 0,
      minHeight: "auto"
    }),
    valueContainer: (styles) => ({
      ...styles,
      paddingLeft: "2px",
      paddingTop: "0",
      paddingBottom: "0"
    }),
    // container: (styles) => ({
    //   ...styles,
    // }),
    //    clearIndicator:styles => ({ ...styles }),
    multiValue: (styles, { data }) => {
      return {
        ...styles,
        backgroundColor: "white",

        border: "none",
        '[role="button"]': {
          color: "transparent" // hide the "x" unless we are hovering
        },
        div: {
          paddingLeft: 0,
          fontSize: 13 // match app default ~13px
        },

        ":hover": {
          '[role="button"]': {
            color: "lightgray" // show the "x"
          }
        }
      };
    },
    multiValueRemove: (styles, { data }) => ({
      ...styles,
      color: "inherit", //""transparent",
      // counteract the paddingLeft:0 above
      paddingLeft: "4px !important",
      ":hover": {
        backgroundColor: lameta_orange,
        color: "white"
      }
    }),
    placeholder: (styles) => ({
      ...styles,
      color: "#999",
      fontSize: 13,
      marginLeft: 2
    }),
    input: (styles) => ({
      ...styles,
      fontSize: 13
    })
  };

  const currentValueArray = props.field.text
    .split(";") // TODO: move this serialization logic into the Field class
    .filter((c) => c.length > 0)
    .map((c) => c.trim())
    .map((code) => {
      // Handle "eng:English" format (code:name)
      if (code.indexOf(":") > 0) {
        const parts = code.split(":");
        return {
          value: parts[0],
          label: parts[1] || getName(props.languageFinder, parts[0])
        };
      }
      // Handle legacy "eng|English" format
      if (code.indexOf("|") > 0) {
        const parts = code.split("|");
        return {
          value: parts[0],
          label: parts[1]
        };
      }
      return {
        value: code,
        label: getName(props.languageFinder, code)
      };
    });

  const loadMatchingOptions = (inputValue, callback) => {
    const matches =
      inputValue.length > 1
        ? props.languageFinder!.makeMatchesAndLabelsForSelect(inputValue)
        : [];
    callback(
      matches.map(
        (m: { languageInfo: Language; nameMatchingWhatTheyTyped: string }) => ({
          value: m.languageInfo.iso639_3,
          label: m.nameMatchingWhatTheyTyped,
          language: m.languageInfo
        })
      )
    );
  };

  // Handle drag-and-drop reordering
  const onSortEnd = useCallback(
    ({ oldIndex, newIndex }: { oldIndex: number; newIndex: number }) => {
      if (oldIndex === newIndex) return;
      const reordered = arrayMove(currentValueArray, oldIndex, newIndex);
      const s = reordered.map((o) => o.value).join(";");
      props.field.setValueFromString(s);
    },
    [currentValueArray, props.field]
  );

  // Custom MultiValue component that wraps each value in a SortableElement with drag handle
  const SortableMultiValueWrapper = useCallback(
    (multiValueProps: any) => {
      // Find the index of this value in the current array
      const index = currentValueArray.findIndex(
        (v) => v.value === multiValueProps.data.value
      );
      return (
        <SortableMultiValue
          index={index}
          ordered={props.ordered}
          displayIndex={index + 1}
          {...multiValueProps}
        />
      );
    },
    [currentValueArray, props.ordered]
  );

  // Custom ValueContainer that wraps multi-values in a sortable container
  const SortableValueContainer = useCallback(
    (containerProps: any) => {
      const { children, selectProps, ...restProps } = containerProps;
      // Separate multi-value items from input
      const childArray = React.Children.toArray(children);
      // The last two children are typically the Input and sometimes a Placeholder
      // Multi-values are elements with data prop
      const multiValues: React.ReactNode[] = [];
      const otherChildren: React.ReactNode[] = [];

      childArray.forEach((child: any) => {
        if (child?.props?.data && child?.props?.data?.value) {
          multiValues.push(child);
        } else {
          // Input and placeholder go here
          otherChildren.push(child);
        }
      });

      // Check if input has value (user is typing)
      const inputValue = selectProps?.inputValue || "";
      const isFocused = selectProps?.menuIsOpen;
      // Show "+ Add Language" prompt when not typing
      const showAddPrompt = !inputValue && !isFocused;

      return (
        <div
          css={css`
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            flex: 1;
            align-items: center;
            padding: 2px 8px;
            gap: 2px;
            overflow: hidden;
          `}
        >
          <SortableMultiValueContainer
            axis="x"
            onSortStart={() => {
              document.body.classList.add("sorting-in-progress");
            }}
            onSortEnd={(args) => {
              document.body.classList.remove("sorting-in-progress");
              onSortEnd(args);
            }}
            useDragHandle
            helperClass="sortable-helper"
          >
            {multiValues}
          </SortableMultiValueContainer>
          {/* "+ Add Language" prompt renders inline before the input within the flex layout */}
          {showAddPrompt && (
            <span
              css={css`
                color: #999;
                font-size: 13px;
                font-style: italic;
                pointer-events: none;
                white-space: nowrap;
              `}
            >
              + Add Language
            </span>
          )}
          {/* Input and placeholder render sequentially after the prompt within the same flex flow */}
          {otherChildren}
        </div>
      );
    },
    [onSortEnd]
  );

  const selectProps = {
    tabIndex: props.tabIndex ? props.tabIndex : undefined,
    name: props.field.labelInUILanguage,
    components: {
      MultiValue: SortableMultiValueWrapper,
      ValueContainer: SortableValueContainer,
      MultiValueLabel: LanguagePill,
      Option: LanguageOption,
      // we aren't going to list 7 thousand languages, so don't pretend. The are just going to have to type.
      DropdownIndicator: null
    },
    className: "select flex-grow field-value-border",
    placeholder: "",
    noOptionsMessage: ({ inputValue }) =>
      inputValue ? "No matches" : "Type language name or code",
    isClearable: false, // don't need the extra "x"
    loadOptions: _.debounce(loadMatchingOptions, 100),
    value: currentValueArray,
    styles: customStyles,
    onChange: (
      v: Array<{ value: string; label: string; __isNew__: boolean }>
    ) => {
      console.log("onChange: " + JSON.stringify(v));
      // if any are new, change the value to "new"
      const newChoices = v
        ? v.map((o) =>
            o.__isNew__ ? { label: o.label, value: `qaa-x-${o.label}` } : o
          )
        : []; // if you delete the last member, you get null instead of []

      // TODO: move this serialization logic into the Field class
      const s: string = newChoices
        .map((o) => {
          return o.value;
        })
        .join(";"); // why semicolong instead of comma? The particpants field as used semicolon for years.
      console.log("saving: " + s);
      props.field.setValueFromString(s);
    },
    isMulti: true
  };

  return (
    <div className={"field " + (props.className ? props.className : "")}>
      <label>{props.field.labelInUILanguage}</label>
      {props.canCreateNew ? (
        <CreatableAsyncSelect
          {...selectProps}
          onCreateOption={(newOption) => {
            window.alert("You created " + newOption);
          }}
        ></CreatableAsyncSelect>
      ) : (
        <AsyncSelect {...selectProps} />
      )}
    </div>
  );
});

// how to render the choice in the drop
// const CustomOption = (props) => {
//   return (
//     <div
//       {...props.innerProps}
//       style={{
//         paddingLeft: "5px",
//         backgroundColor: props.isFocused
//           ? /*"#cff09f"*/ saymore_orange
//           : "white",
//       }}
//     >
//       <div>
//         {props.data.label}
//         <span className="isoCode">{props.data.value}</span>
//       </div>
//     </div>
//   );
// };

// things like German are currently in our index as "German, Standard". This looks weird when it is in a list of other language names.
// So just make it, e.g., "Standard German"
function getName(languageFinder: LanguageFinder, code: string): string {
  const name = languageFinder!.findOneLanguageNameFromCode_Or_ReturnCode(code);

  // first, languages with custom codes need special name handling
  // if (
  //   name === code ||
  //   // see https://tools.ietf.org/html/bcp47 note these are language tags, not subtags, so are qaa-qtz, not qaaa-qabx, which are script subtags
  //   (code.toLowerCase() >= "qaa" &&
  //     code.toLowerCase() <= "qtz" &&
  //     name.indexOf("[Unlisted]") >= 0)
  // ) {
  //   //code.substr(0, 2).toLowerCase() === "qa") {
  //   return code;
  // }

  // now remove any commas
  const parts = name.split(",");
  if (parts.length === 1) {
    return name;
  }
  return parts[1] + " " + parts[0];
}
