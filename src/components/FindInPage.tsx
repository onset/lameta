// Renderer Process (React Component using Material UI)
import React, { useRef, useState } from "react";
import { TextField, Button, Box, IconButton } from "@mui/material";
import { mainProcessApi } from "../mainProcess/MainProcessApiAccess";
import SearchIcon from "@mui/icons-material/Search";

const FindInPage = () => {
  const [searchText, setSearchText] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event) => {
    setSearchText(event.target.value);
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleFind();
    }
  };

  const handleFind = () => {
    mainProcessApi.findInPage(searchText);
    // Use a small timeout to ensure focus is restored after the findInPage operation
    setTimeout(() => {
      inputRef.current?.focus();
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
      <TextField
        id="find-in-page"
        variant="standard"
        value={searchText}
        onChange={handleChange}
        size="small"
        inputRef={inputRef}
        onKeyPress={handleKeyPress}
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
