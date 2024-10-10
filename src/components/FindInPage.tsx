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
        p: 1
      }}
    >
      <TextField
        id="find-in-page"
        variant="outlined"
        value={searchText}
        onChange={handleChange}
        onKeyPress={handleKeyPress}
        size="small"
        sx={{
          mr: 1,
          p: 0,
          "& .MuiOutlinedInput-root": {
            padding: "2px" // Reduce padding inside the input
          },
          "& .MuiInputLabel-root": {
            transform: "translate(12px, 8px) scale(1)" // Adjust label position for compactness
          }
        }}
        inputRef={inputRef}
        InputProps={{
          sx: {
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
