import { observable, reaction, runInAction } from "mobx";

// The text editors that have the focus. The problem checks wait until the user
// leaves the field they are typing in, because nobody needs problems brought up to
// date between keystrokes, and a check in the middle of typing makes the typing lag.
// Shallow, because a deep set would hold an observable copy of each editor's token,
// which `delete` with the token itself would not find.
const editorsWithFocus = observable.set<object>(undefined, { deep: false });

export function startedTyping(editor: object) {
  runInAction(() => editorsWithFocus.add(editor));
}

// Also when the editor is removed while it has the focus, which may send no blur
export function stoppedTyping(editor: object) {
  runInAction(() => editorsWithFocus.delete(editor));
}

export function isTyping(): boolean {
  return editorsWithFocus.size > 0;
}

// Calls `run` now, or once the user has left the text field that they are in.
// Returns a function that cancels the call.
export function afterTyping(run: () => void): () => void {
  if (!isTyping()) {
    run();
    return () => {};
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const dispose = reaction(
    () => isTyping(),
    (typing) => {
      if (typing) return;
      dispose();
      // let the editor finish writing the field as it is left
      timer = setTimeout(run, 0);
    },
  );
  return () => {
    dispose();
    if (timer) clearTimeout(timer);
  };
}
