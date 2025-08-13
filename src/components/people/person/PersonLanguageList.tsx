import { css } from "@emotion/react";
import { Trans } from "@lingui/macro";
/* removed emotion jsx declaration */

import React, { useState, useEffect, useRef, useMemo } from "react";
import ReactDOM from "react-dom";
//import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import {
  SortableContainer,
  SortableElement,
  SortableHandle
} from "react-sortable-hoc";
// @ts-ignore
import dragIcon from "@assets/drag-affordance.svg";
import {
  Person,
  maxOtherLanguages
} from "../../../model/Project/Person/Person";
import { LanguageFinder } from "../../../languageFinder/LanguageFinder";
import { OldPersonLanguagesEditor } from "./OldPersonLanguagesEditor";
import arrayMove from "array-move";
import { OnePersonLanguageEditor } from "./OnePersonLanguageEditor";
import { IPersonLanguage } from "../../../model/PersonLanguage";
import { observer } from "mobx-react";
import { FieldLabel } from "../../FieldLabel";

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
    <div
      css={css`
        gap: 10px;
        display: flex;
        flex-direction: column;
      `}
    >
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
  const languagesDefinition = useMemo(
    () => props.person.properties.getFieldDefinition("languages"),
    []
  );
  const [newLanguagePlaceholder, setNewLanguagePlaceholder] =
    useState<IPersonLanguage | undefined>(undefined);
  const [focusOnPlaceholder, setFocusOnPlaceholder] = useState(false);
  // Show an empty slot if there are no languages listed at all
  useEffect(() => {
    if (props.person.languages.length === 0)
      setNewLanguagePlaceholder({} as any as IPersonLanguage);
    setFocusOnPlaceholder(false);
  }, [props.person.languages]);

  if (newLanguagePlaceholder) slots.push(newLanguagePlaceholder);
  const editors = slots.map((l, index) => (
    <OnePersonLanguageEditor
      language={l}
      languageFinder={props.languageFinder}
      autoFocus={focusOnPlaceholder}
      onChange={(code: string) => {
        if (l === newLanguagePlaceholder) {
          newLanguagePlaceholder.code = code;
          props.person.languages.push(newLanguagePlaceholder);
          setNewLanguagePlaceholder(undefined);
        } else if (!code) {
          props.person.languages.splice(index, 1);
        } else {
          l.code = code;
        }
      }}
    />
  ));

  return (
    <div className="languages">
      <FieldLabel fieldDef={languagesDefinition} />
      <SortableList
        items={editors}
        axis={"y"}
        lockAxis={"y"}
        useDragHandle
        onSortEnd={({ oldIndex, newIndex }, event) => {
          // don't allow drag of an empty box
          if (
            oldIndex >= props.person.languages.length ||
            !props.person.languages[oldIndex].code
          ) {
            event.preventDefault();
          } else {
            //setLangElements(arrayMove(langElements, oldIndex, newIndex));
            props.person.languages = arrayMove(
              props.person.languages,
              oldIndex,
              newIndex
            );
          }
        }}
      />
      {/* Show a new language link if there is not already an empty slot */}
      {!!newLanguagePlaceholder || (
        <a
          onClick={(x) => {
            setNewLanguagePlaceholder({} as any as IPersonLanguage);
            setFocusOnPlaceholder(true);
          }}
        >
          <Trans>Add Language</Trans>
        </a>
      )}
    </div>
  );
});
