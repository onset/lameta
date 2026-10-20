import { ProjectTabId } from "../../navigation/NavigationState";

// Which ProjectTab sub-tab shows the fields of each `form` in fields.json5.
// This lives outside ProjectTab.tsx so that navigateTo() and unit tests can use it
// without loading the UI. When a ProjectTab tab that shows an AutoForm is added or
// removed, change this too.
// Every form used by an archive configuration must be here (src/navigation/formTabs.spec.ts checks).
export const kProjectTabOfForm: Record<string, ProjectTabId> = {
  ArchiveConfiguration: "archive",
  project: "project",
  fundingProject: "grant",
  languages: "languages",
  projectLocation: "location",
};
