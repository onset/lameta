// this engages a babel macro that does cool emotion stuff (like source maps). See https://emotion.sh/docs/babel-macros
import css from "@emotion/css/macro";
// these two lines make the css prop work on react elements
import { jsx } from "@emotion/core";
/** @jsx jsx */

import React, { useState } from "react";
import ReactDOM from "react-dom";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

const reorder = (list: string[], startIndex, endIndex): string[] => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
};

const grid = 8;

const Item: React.FunctionComponent<{ label: string; index: number }> = (
  props
) => {
  return (
    <Draggable draggableId={props.label} index={props.index}>
      {(provided) => (
        <div
          css={css`
            width: 200px;
            //margin-bottom: ${grid}px
            padding: ${grid}px;
            display: flex;
          `}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          <DragAffordance />
          <div
            css={css`
              background-color: white;
            `}
          >
            {props.label}
          </div>
        </div>
      )}
    </Draggable>
  );
};

const firstList = ["11111111", "222222222", "33333333333"];

export const PersonLanguageList: React.FunctionComponent<{ items }> = (
  props
) => {
  const [list, setList] = useState(firstList);

  const onDragEnd = (result) => {
    if (!result.destination) {
      return;
    }

    if (result.destination.index === result.source.index) {
      return;
    }

    const newList = reorder(
      list,
      result.source.index,
      result.destination.index
    );

    setList(newList);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="list">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            {list.map((l: string, index: number) => (
              <Item index={index} label={l} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};

export const DragAffordance: React.FunctionComponent<{}> = (props) => (
  <span
    css={css`
      content: "....";
      width: 16px;
      height: 20px;
      display: inline-block;
      overflow: hidden;
      line-height: 5px;
      padding: 3px 4px;
      cursor: move;
      vertical-align: middle;
      //margin-top: -0.7em;
      margin-right: 0.3em;
      font-size: 12px;
      font-weight: bold;
      font-family: sans-serif;
      letter-spacing: 2px;
      color: #6b6b6b;
      //text-shadow: 1px 0 1px black;

      &:after {
        content: ".. .. .. ..";
      }
    `}
  ></span>
);
