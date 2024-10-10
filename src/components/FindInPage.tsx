// Renderer Process (React Component using Material UI)
import React, { useRef, useState } from "react";
import { TextField, Button, Box, IconButton } from "@mui/material";
import { mainProcessApi } from "../mainProcess/MainProcessApiAccess";
import SearchIcon from "@mui/icons-material/Search";
import { set } from "lodash";
const FindInPage = () => {
  const [searchText, setSearchText] = useState("");

  const handleChange = (event) => {
    setSearchText(event.target.value);
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter") {
      handleFind();
    }
  };
  const handleFind = () => {
    // Remember the focus and insertion point
    const selection = window.getSelection();

    const inputElement = inputRef.current;
    // Perform the search
    mainProcessApi.findInPage(searchText);

    // this works but then subsequent presses of Enter dont move us through the document becuase we've lost the focus on the previous one

    // setTimeout(() => {
    //   if (inputElement) {
    //     inputElement.focus();
    //     inputElement.setSelectionRange(0, searchText.length);
    //   }
    // }, 10);

    // setTimeout(() => {
    //   if (inputElement) inputElement.focus();
    // }, 50);
  };
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        p: 0
      }}
    >
      <TextField
        id="find-in-page"
        variant="standard"
        value={searchText}
        onChange={handleChange}
        onKeyPress={handleKeyPress}
        size="small"
        inputRef={inputRef}
        InputProps={{
          sx: {
            width: "100px",
            padding: "0px" // Reduce padding for the input element itself
          }
        }}
      />
      <IconButton color="black" onClick={handleFind}>
        <SearchIcon />
      </IconButton>
    </Box>
  );
};

export default FindInPage;
