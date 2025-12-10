// Session Form Layout Variant Configuration
// Change this value to switch between different session form layouts:
//   "v1" - Original: Fixed 50px rows, Description spans 3 rows
//   "v2" - Auto rows: Single grid, rows grow as needed with max-height
//   "v3" - Two columns: Explicit rows with align-items: start to reduce gaps

export type SessionFormVariant = "v1" | "v2" | "v3";

export const SESSION_FORM_VARIANT: SessionFormVariant = "v3";

// Returns the CSS class name for the current variant
export function getSessionFormClass(): string {
  return `sessionForm sessionForm-${SESSION_FORM_VARIANT}`;
}
