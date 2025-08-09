## Folder / Metadata Filtering & Highlighting

### Overview

This document summarizes the implementation of the folder (Sessions / People) filtering feature, filename inclusion, and inline highlighting of query matches across the UI. It also records design decisions and future improvement ideas.

### Goals Achieved

1. Provide a single find box ("Find") above each FolderList (Sessions / People tabs) enabling live filtering while typing (debounced).
2. Support searching across:
   - Core folder textual fields (title, id, name, status, etc.).
   - All text field values (through folder group filtering logic / Fuse index).
   - File names contained within a folder (so entering an extension like `mp3` surfaces folders that have such files).
3. Maintain stable selection after filtering (selectedIndex adjusted as needed).
4. Provide visual inline highlighting for:
   - FolderList table cells containing matched substrings.
   - FileList file names.
   - TextFieldEdit metadata values (non-destructive: markup removed while editing, restored when blurring/when not focused).
5. Keep filtering fast via a per-FolderGroup index with Fuse.js plus a fallback path.
6. Propagate the current query via React context (SearchContext) to avoid prop drilling and enable highlight logic throughout.
7. Ensure tests cover filtering, filename matching, and highlight appearance / clearing.

### Key Files

| Area                                  | File                                                             | Purpose / Notes                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Search context                        | `src/components/SearchContext.tsx`                               | Provides `{ query }` to consumers (FolderList, FileList, TextFieldEdit, etc.).                                                                                                                                                                                                                                                                             |
| UI Search Bar                         | `src/components/FolderList.tsx`                                  | Renders MUI TextField + icons, debounce (150ms) before calling `folders.filter(query)`, updates `onSearchQueryChange` for context state owner (ComponentTab). Applies inline `<mark>` highlighting in cell renderers using `query`.                                                                                                                        |
| Model Filtering                       | `src/model/Folder/Folder.ts`                                     | `FolderGroup.filter()` attaches/uses per-group `FolderIndex`; falls back to manual scan (fields + filenames) if index absent or empty query. Adjusts `selectedIndex` post-filter.                                                                                                                                                                          |
| Indexing                              | `src/model/Folder/FolderIndex.ts`                                | Wraps Fuse.js. Rebuilds reactively (MobX reaction) when folder item/file data changes. Exposes search to FolderGroup.                                                                                                                                                                                                                                      |
| Filename Highlighting                 | `src/components/FileList.tsx`                                    | Splits filename strings around query and wraps matches with `<mark data-testid="inline-highlight">`.                                                                                                                                                                                                                                                       |
| Metadata Field Highlighting & Editing | `src/components/TextFieldEdit.tsx`                               | Uses `contentEditable` div. When not focused, innerHTML contains `<mark>` wrappers built by `buildHighlightedHTML`. On focus, strips marks for clean editing (plain text). On blur, saves plain text (never stores markup) and re-applies highlighting if query present. Background color for `<mark>`: `#ffba8a`. Ensures no persisted `<mark>` in model. |
| Component Tab (Search State Owner)    | `src/components/componentTab/ComponentTab.tsx`                   | Holds the current query state; provides SearchContext. (Referenced earlier during context introduction.)                                                                                                                                                                                                                                                   |
| E2E Tests                             | `e2e/folderSearch.e2e.ts`                                        | Covers search UI, filename matching (`mp3`), inline highlight presence for filenames & text fields, highlight clearing.                                                                                                                                                                                                                                    |
| Supporting                            | `src/components/FileList.scss`, `src/components/FolderList.scss` | Base styling; highlight color set inline via Emotion for now.                                                                                                                                                                                                                                                                                              |

### Highlighting Implementation Details

FolderList & FileList use a shared approach: case-insensitive regex splitting while escaping special characters. Each exact substring match is wrapped in `<mark data-testid="inline-highlight" style="background:#ffba8a;">` with minimal padding. TextFieldEdit builds the marked HTML manually (escaped) to avoid React reconciliation complexity with frequent edits; it removes marks while the user is editing to prevent caret and selection issues.

### Filter Flow

1. User types in search bar (`FolderList` state `searchText`).
2. Debounced handler (150ms) invokes `folders.filter(query)` and notifies parent via `onSearchQueryChange`.
3. `ComponentTab` updates context value; consumers re-render.
4. `FolderGroup.filter()` calls its `FolderIndex` (Fuse) if present; else attaches one lazily. Returns matched folders or clears filtering on empty query.
5. `filteredItems` observable drives FolderList table `data` prop; selection is adjusted if previous selection is filtered out.
6. Highlight components consume `query` from context and inline-mark matches.

### Selection Integrity

After filtering, FolderGroup ensures that:

- If previous selected folder still in filtered set, retains selection via updated index.
- Else selects nearest valid index or clears selection (-1) depending on implementation (see `adjustSelectionAfterFilter`).

### Performance Considerations

- Debounce prevents churn on each keystroke.
- Single Fuse index per FolderGroup avoids rebuilding per keystroke (only on data mutation triggers reaction-based rebuild).
- Fallback path avoids index overhead for trivial/empty queries.
- Highlighting splits strings only for visible rows / filenames, minimizing work.

### Error Handling / Recent Fix

Encountered "Invalid hook call" due to using `React.useContext` inside class `FolderList`. Resolved by adding `static contextType = SearchContext;` and reading `this.context`. This restored proper rendering and prevented the error boundary from triggering.

### Current Visuals

- Highlight color unified: `#ffba8a` for all `<mark>` usage.
- TextFieldEdit removes highlight during editing to avoid interfering with caret placement.

### Testing Notes

- E2E coverage ensures highlights appear and disappear appropriately and filename-based filtering works.
- (Pending) A dedicated unit test could assert that `props.field.text` never contains markup after interactions. (See TODO.)

### TODO Now

- [x] Consolidate highlight utility (currently duplicated logic in FolderList, FileList, TextFieldEdit) into a shared helper to avoid divergence.
- [ ] Adding a new Session or Folder should clear the filter (and select the new item). Verify this with an e2e test.
- [ ] Add a count below the folder list (e.g. "234 Sessions"), and when filtered, show "12 matches".
- [ ] Add e2e test ensuring that a new folder is selected when filtering removes selected folder, and no folder is selected if the filter has zero hits.
- [ ] Currently if you are in Sessions and set a filter then switch to the Project tab and come back, the filter is still in place however the "find" field has lost your search term (it should persist), and there is no "x" button. Probababy the current search string should be a field in FolderPane. e2e test this.

### TODO Later

- [ ] Highlight matches on UI fields that don't use TextFieldEdit, including genre, AccessChooser, Subject Langauges, Working Languages. Include an e2e test to verify that all of these highlights work. Add e2e tests.
- [ ] If the Notes field is where a match is, highlight the label of the Notes tab as well to draw the user there. Add e2e tests.
- [ ] Match not only on the fields of a Folder, but also on the metadata fields of its child files. If a match is in the fields of a file, highlight that file in the FileList. For example, an audio file has Notes, and Custom Fields. Add e2e tests.
- [ ] Add e2e test for filename match where case differs (ensures case-insensitive path executed).
- [ ] Introduce minimum query length (e.g. 2) to avoid indexing overhead for single-character searches if performance issues arise.
- [ ] Add test ensuring `Field.text` never persists `<mark>` tags after editing cycles.
- [ ] Ensure that we have e2e tests that check that we get reasonable behavior for things like: adding a new session or person then filtering, adding or removing text from a folder and then filtering. We don't expect the filter to change in real time, but the next time we filter (or press the magnifying glass button to re-filter), we should see the correct list.

### Polishing

- [ ] Make sure all strings added to the UI here (find, matches) are set up to be localized with lingui.
- [ ] Escape / clear search when user presses Esc in the search field.
- [ ] Add keyboard shortcut (e.g. F3 and Ctrl/Cmd+F while focus in pane) to focus the folder search input.

## NOT YET

- [ ] Switch to Fuse.js `includeMatches` option to derive precise match indices instead of regex-splitting, enabling multi-term / fuzzy highlight fidelity.
- [ ] Debounce highlight re-render separately from filter (currently both coupled to same query changes).
- [ ] Consider lowering highlight DOM churn by only wrapping first N matches per cell when very large texts.
- [ ] Virtualize long FolderList/FileList tables (react-window) if dataset size grows large to reduce DOM size during highlighting.
