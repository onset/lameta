import * as React from "react";
import { css } from "@emotion/react";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import { t } from "@lingui/macro";
import { i18n } from "../other/localization";
import { FolderGroup } from "src/model/Folder/FolderGroup";
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
    // Use folders.searchTerm only for persisted normalized match logic; UI adornments should reflect what user has typed (rawValue)
    const value = folders.searchTerm || ""; // legacy persisted value (may lag while typing in empty list state)
    // Track raw user input; initialize from lastSearch prop (state persisted in parent) so tab switches retain visual input
    const [rawValue, setRawValue] = React.useState<string>(lastSearch);
    // Sync when external lastSearch prop changes (e.g., programmatic clear)
    React.useEffect(() => {
      setRawValue(lastSearch);
    }, [lastSearch]);

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

    const handleChange = (v: string) => {
      setRawValue(v);
      // When there are no items (e.g., People tab before adding any person) rapid re-filtering on each keystroke
      // causes the input to lose focus mid-typing, dropping spaces in E2E typing. Defer filtering until Enter/button
      // in that edge case; still clear immediately when emptied.
      if (folders.items.length === 0) {
        if (!v.trim()) {
          commit("");
        }
        return;
      }
      commit(v);
    };
    const handleImmediateCommit = () => commit(rawValue);
    const clear = () => commit("");

    return (
      <div
        className="folderSearchBar"
        data-testid="folder-search-bar"
        data-last-search={rawValue}
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
          value={rawValue}
          variant="outlined"
          inputProps={{ "data-testid": "folder-search-input" }}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleImmediateCommit();
            }
          }}
          InputProps={{
            startAdornment: rawValue ? (
              <InputAdornment position="start">
                <IconButton
                  size="small"
                  onClick={handleImmediateCommit}
                  data-testid="folder-search-button"
                  aria-label={i18n._(t`Search`)}
                  css={css`
                    background: ${lameta_orange};
                    color: white; /* icon color */
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
            endAdornment: rawValue ? (
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
            & .MuiOutlinedInput-input {
              font-weight: 500;
              transition: font-weight 0.15s ease-in-out;
            }
          `}
        />
      </div>
    );
  }
);
