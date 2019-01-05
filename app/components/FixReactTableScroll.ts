// The selected item is preserved because we have a "key" attribute on the table.
// Here we need to scroll the selected item into view when we've come back from
// looking at something else, otherwise it can be selected but not visible.
// We then call this when the ReactTable issues a fetchdata event. Note that previously
// we did this on ComponentDidUpdate, and that helped for switching between folders
// (e.g. different sessions) but did not help when switching between the top level tabs
// (e.g. between Project and Sessions) because there are no props changes to trigger it,
// but when React-Table would become visible and redraw, it would fail to restore the
// scroll position.
// Doesn't appear to be a more elegant way: https://github.com/react-tools/react-table/issues/420

export default function scrollSelectedIntoView(reactTableSelector: string) {
  const table = document.getElementsByClassName(reactTableSelector)[0];
  const selectedRow = table.getElementsByClassName("rt-tr selected")[0];
  if (selectedRow) {
    selectedRow.scrollIntoView({ block: "nearest", inline: "start" });
  }
}
