// this engages a babel macro that does cool emotion stuff (like source maps). See https://emotion.sh/docs/babel-macros
import css from "@emotion/css/macro";
// these two lines make the css prop work on react elements
import { jsx } from "@emotion/core";
/** @jsx jsx */

import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
//import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import {
  SortableContainer,
  SortableElement,
  SortableHandle,
} from "react-sortable-hoc";
// @ts-ignore
import dragIcon from "drag-affordance.svg";
import {
  Person,
  maxOtherLanguages,
} from "../../../model/Project/Person/Person";
import { LanguageFinder } from "../../../languageFinder/LanguageFinder";
import { OldPersonLanguagesEditor } from "./OldPersonLanguagesEditor";
import arrayMove from "array-move";
import { OnePersonLanguageEditor } from "./OnePersonLanguageEditor";
import { Trans } from "@lingui/react";
import { PersonLanguage } from "../../../model/PersonLanguage";
import { observer } from "mobx-react";

const reorder = (list: string[], startIndex, endIndex): string[] => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
};

const grid = 8;
const DragHandle = SortableHandle(() => (
  <img
    src={dragIcon}
    css={css`
      margin-top: auto;
      margin-bottom: auto;
      margin-right: 10px;
      height: 14px;
      user-select: none;
    `}
  />
));
const SortableItem = SortableElement(({ value }) => (
  <div
    css={css`
      display: flex;
    `}
  >
    <DragHandle />
    {value}
  </div>
));
const SortableList = SortableContainer(({ items }) => {
  return (
    <div className="languages">
      {items.map((value, index) => (
        <SortableItem key={index} index={index} value={value} />
      ))}
    </div>
  );
});

export const PersonLanguageList: React.FunctionComponent<{
  person: Person;
  languageFinder: LanguageFinder;
}> = observer((props) => {
  const slots = [...props.person.languages];

  const [newLanguagePlaceholder, setNewLanguagePlaceholder] = useState<
    PersonLanguage | undefined
  >(undefined);
  const [focusOnPlaceholder, setFocusOnPlaceholder] = useState(false);
  // Show an empty slot if there are no languages listed at all
  useEffect(() => {
    if (props.person.languages.length === 0)
      setNewLanguagePlaceholder(new PersonLanguage(""));
    setFocusOnPlaceholder(false);
  }, [props.person.languages]);

  //const [langElements, setLangElements] = useState<JSX.Element[]>([]);
  const father = props.person.properties.getTextField("fathersLanguage");
  const mother = props.person.properties.getTextField("mothersLanguage");

  // useEffect(() => {
  //   // gather up the existing "other languages"
  //   const languages: string[] = new Array(maxOtherLanguages)
  //     .fill(0)
  //     .map((ignore, index) => {
  //       const lang: string = props.person.properties.getTextStringOrEmpty(
  //         "otherLanguage" + index
  //       );
  //       return lang.length > 0 ? lang : null;
  //     })
  //     .filter((l) => l != null) as string[];

  //   //collapse away any empty lines
  //   for (let i = 0; i < maxOtherLanguages; i++) {
  //     if (i < languages.length) {
  //       props.person.properties.setText("otherLanguage" + i, languages[i]);
  //     } else {
  //       props.person.properties.setText("otherLanguage" + i, "");
  //     }
  //   }
  //   // make a blank one to fill out, if we aren't already at the max
  //   if (languages.length < maxOtherLanguages) {
  //     languages.push("");
  //   }
  //   setShowAdd(languages.length < maxOtherLanguages);

  //   // create elements for each of those slots
  //   setLangElements(
  //     languages.map((l, index) => (
  //       <PersonLanguagesEditor
  //         key={index}
  //         language={props.person.properties.getTextField(
  //           "otherLanguage" + index
  //         )}
  //         fatherLanguage={father}
  //         motherLanguage={mother}
  //         languageFinder={props.languageFinder}
  //       />
  //     ))
  //   );
  // }, [iteration]);

  if (newLanguagePlaceholder) slots.push(newLanguagePlaceholder);
  const editors = slots.map((l, index) => (
    <OnePersonLanguageEditor
      language={l}
      languageFinder={props.languageFinder}
      autoFocus={focusOnPlaceholder}
      onChange={(tag: string) => {
        if (l === newLanguagePlaceholder) {
          newLanguagePlaceholder.tag = tag;
          props.person.languages.push(newLanguagePlaceholder);
          setNewLanguagePlaceholder(undefined);
        } else if (!tag) {
          props.person.languages.splice(index, 1);
        } else {
          l.tag = tag;
        }
      }}
    />
  ));

  return (
    <div>
      <SortableList
        items={editors}
        axis={"y"}
        lockAxis={"y"}
        useDragHandle
        onSortEnd={({ oldIndex, newIndex }) => {
          //setLangElements(arrayMove(langElements, oldIndex, newIndex));
          props.person.languages = arrayMove(
            props.person.languages,
            oldIndex,
            newIndex
          );
        }}
      />
      {/* {!newLanguage || (
        <OnePersonLanguageEditor
          key={"slotfornewone"}
          language={newLanguage}
          languageFinder={props.languageFinder}
          autoFocus={true}
          onChange={(tag: string) => {
            newLanguage.tag = tag;
            props.person.languages.push(newLanguage);
            setNewLanguage(undefined);
          }}
        />
      )} */}
      {/* Show a new language link if there is not already an empty slot */}
      {!!newLanguagePlaceholder || (
        <a
          onClick={(x) => {
            setNewLanguagePlaceholder(new PersonLanguage(""));
            setFocusOnPlaceholder(true);
          }}
        >
          <Trans>Add Language</Trans>
        </a>
      )}
    </div>
  );
});
