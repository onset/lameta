import * as React from "react";
import { css } from "@emotion/react";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import { t } from "@lingui/macro";
import { i18n } from "../other/localization";
import { FolderGroup } from "../model/Folder/Folder";
import { observer } from "mobx-react";
import { lameta_orange } from "../containers/theme";

interface ISearchBarProps {
  folders: FolderGroup;
  lastSearch: string;
  searchCount: number;
  currentSearchResetCounter: number;
  onCommitted: (s: string) => void;
}

export const SearchBar: React.FC<ISearchBarProps> = observer(
  ({
    folders,
    lastSearch,
    searchCount,
    currentSearchResetCounter,
    onCommitted
  }) => {
    const value = folders.searchQuery || "";

    const commit = React.useCallback(
      (v: string) => {
        onCommitted(v);
        if (!v.trim()) {
          folders.filter("");
        } else {
          folders.filter(v);
        }
      },
      [folders, onCommitted]
    );

    const handleChange = (v: string) => commit(v);
    const handleImmediateCommit = () => commit(value);
    const clear = () => commit("");

    return (
      <div
        className="folderSearchBar"
        data-testid="folder-search-bar"
        data-last-search={lastSearch}
        data-search-count={searchCount}
        data-search-reset-counter={currentSearchResetCounter}
        css={css`
          padding: 4px 6px 2px 6px;
          display: flex;
          flex-direction: row;
          align-items: center;
          background: transparent;
        `}
      >
        <TextField
          size="small"
          placeholder={i18n._(t`Find`)}
          value={value}
          variant="outlined"
          inputProps={{ "data-testid": "folder-search-input" }}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleImmediateCommit();
            }
          }}
          InputProps={{
            startAdornment: value ? (
              <InputAdornment position="start">
                <IconButton
                  size="small"
                  onClick={handleImmediateCommit}
                  data-testid="folder-search-button"
                  aria-label={i18n._(t`Search`)}
                  css={css`
                    background: ${lameta_orange};
                    color: white; /* sets icon color */
                    padding: 2px;
                    &:hover {
                      background: ${lameta_orange};
                    }
                  `}
                >
                  <SearchIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : (
              <InputAdornment position="start">
                <SearchIcon
                  fontSize="small"
                  data-testid="folder-search-icon"
                  css={css`
                    opacity: 0.6;
                  `}
                />
              </InputAdornment>
            ),
            endAdornment: value ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={clear}
                  aria-label={i18n._(t`Clear`)}
                  data-testid="folder-search-clear"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : undefined
          }}
          css={css`
            flex: 1;
            & .MuiOutlinedInput-root {
              height: 32px;
            }
          `}
        />
      </div>
    );
  }
);
