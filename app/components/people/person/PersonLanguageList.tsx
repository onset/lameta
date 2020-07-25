// this engages a babel macro that does cool emotion stuff (like source maps). See https://emotion.sh/docs/babel-macros
import css from "@emotion/css/macro";
// these two lines make the css prop work on react elements
import { jsx } from "@emotion/core";
/** @jsx jsx */

import React, { useState, useEffect } from "react";
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
        <SortableItem key={`item-${value}`} index={index} value={value} />
      ))}
    </div>
  );
});

export const PersonLanguageList: React.FunctionComponent<{
  person: Person;
  languageFinder: LanguageFinder;
}> = (props) => {
  const [iteration, setIteration] = useState(0);
  const [showAdd, setShowAdd] = useState(false);

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

  const editors = props.person.languages.map((l, index) => (
    <OnePersonLanguageEditor
      key={index}
      language={l}
      languageFinder={props.languageFinder}
      onChange={(tag: string) => {
        if (!tag) {
          props.person.languages.splice(index, 1);
        } else {
          l.tag = tag;
        }
        setIteration(iteration + 1);
      }}
    />
  ));

  return (
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
        setIteration(iteration + 1);
      }}
    />
  );
};
