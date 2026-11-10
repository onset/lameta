import { FileTabId } from "../navigation/NavigationState";

// This lives outside FolderPane.tsx so that navigateTo() and unit tests can use it
// without loading the UI. When FileTabs (in FolderPane.tsx) gets or loses a tab,
// change this too.

// Which tab shows a field of a session's or person's own metadata file, by the
// field's `form` in fields.json5 (a field with no form is "primary").
// Every form used by an archive configuration must be here (src/navigation/formTabs.spec.ts checks).
export const kSessionTabOfForm: Record<string, FileTabId> = {
  primary: "session",
  status: "status",
};
export const kPersonTabOfForm: Record<string, FileTabId> = {
  primary: "person",
};

// Returns undefined if no tab shows this field.
// "notes" and "contributions" (the list of contributors of a session or media file)
// are not in fields.json5; each has its own tab. A person file has no "contributions":
// its Contributions tab lists what the sessions say the person contributed.
export function getFileTabOfField(
  file: "session" | "person" | "other",
  fieldKey: string,
  form: string | undefined,
): FileTabId | undefined {
  if (fieldKey === "notes") return "notes";
  if (fieldKey === "contributions") return "contributors";
  if (file === "other") return "properties";
  return (file === "session" ? kSessionTabOfForm : kPersonTabOfForm)[form || "primary"];
}
