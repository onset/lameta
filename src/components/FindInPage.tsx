import React, { useRef, useState, useEffect } from "react";
import { Box, IconButton } from "@mui/material";
import { css } from "@emotion/react";
import { mainProcessApi } from "../mainProcess/MainProcessApiAccess";
import SearchIcon from "@mui/icons-material/Search";

const FindInPage = ({ autoFocus }: { autoFocus?: boolean }) => {
  const [searchText, setSearchText] = useState("");
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoFocus && divRef.current) {
      divRef.current.focus();
    }
  }, [autoFocus]);

  const setCursorToEnd = () => {
    const div = divRef.current;
    if (!div) return;
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(div);
    range.collapse(false); // false means collapse to end
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  const handleChange = (event: React.FormEvent<HTMLDivElement>) => {
    setSearchText(event.currentTarget.textContent || "");
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleFind();
      // Ensure focus is restored after the Enter key press
      setTimeout(() => {
        divRef.current?.focus();
        setCursorToEnd();
      }, 10);
    }
  };

  const handleFind = () => {
    mainProcessApi.findInPage(searchText);
    setTimeout(() => {
      divRef.current?.focus();
      setCursorToEnd();
    }, 10);
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        p: 0
      }}
    >
      <div
        ref={divRef}
        css={css`
          width: 100px;
          min-height: 1.4em;
          padding: 2px 4px;
          border: none;
          border-bottom: 1px solid rgba(0, 0, 0, 0.42);
          outline: none;
          font-size: inherit;
          font-family: inherit;
          line-height: inherit;

          &::selection {
            background-color: transparent;
          }
        `}
        contentEditable
        suppressContentEditableWarning
        onInput={handleChange}
        onKeyPress={handleKeyPress}
        role="textbox"
        tabIndex={0}
      />
      <IconButton
        onClick={handleFind}
        css={css`
          color: black;
        `}
      >
        <SearchIcon />
      </IconButton>
    </Box>
  );
};

export default FindInPage;
