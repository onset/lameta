import { titleCase } from "title-case";
import type { Capitalization, FieldDefinition } from "./FieldDefinition";
import type { Field } from "./Field";
import type { FieldSet } from "./FieldSet";
import type { Folder } from "../Folder/Folder";

// A field whose definition has a `capitalization` is put in that case where the person
// sees it (when its folder is displayed and when they leave the field) and again in
// the IMDI export, which also gets text that arrives by other routes, such as an import.

// The text in the case that the field's definition asks for
export function applyCapitalization(definition: FieldDefinition | undefined, text: string): string {
  return inCase(definition?.capitalization, text);
}

function inCase(capitalization: Capitalization | undefined, text: string): string {
  switch (capitalization) {
    case "sentence":
      return upperFirst(text);
    case "ELARTerm":
      return text.replace(
        /^(\s*\S+)(.*)$/su,
        (_, first: string, rest: string) =>
          upperFirst(first) +
          rest.replace(/(\s+)(\S+)/g, (__, space: string, word: string) =>
            word === word.toUpperCase() || word.length <= 2 || /[^a-zA-Z]/.test(word)
              ? space + word
              : space + word.toLowerCase(),
          ),
      );
    case "title":
      return titleCase(text);
    case "upper":
      return text.toUpperCase();
    case "lower":
      return text.toLowerCase();
    default:
      return text;
  }
}

function upperFirst(text: string): string {
  return text.replace(/^(\s*)(\p{Ll})/u, (_, space, letter) => space + letter.toUpperCase());
}

// Puts the field's text in its case, in each language, or for a comma-separated field
// such as topic, in each item. Leaves alone a genre from the genre list, which is
// stored by its id, and multilingual text still in slash form ("English / Spanish"),
// which the person has not yet converted to separate languages.
export function capitalizeField(field: Field): void {
  const definition = field.definition;
  if (!definition?.capitalization) return;
  if (definition.multilingual && field.looksLikeSlashSyntax()) return;
  if (field.key === "genre" && isGenreFromTheList(field)) return;
  const fix = (text: string) =>
    field.isCommaSeparated
      ? text
          .split(",")
          .map((item) => applyCapitalization(definition, item))
          .join(",")
      : applyCapitalization(definition, text);
  for (const tag of field.getAllNonEmptyTextAxes()) {
    const text = field.getTextAxis(tag);
    const fixed = fix(text);
    if (fixed !== text) field.setTextAxis(tag, fixed);
  }
  if (field.key === "genre") {
    // a genre that someone typed is shown by the label of the choice it made
    const custom = definition.complexChoices?.find(
      (c) => c.source === "custom" && c.id === field.text.toLowerCase(),
    );
    if (custom) custom.label = field.text;
  }
}

function isGenreFromTheList(field: Field): boolean {
  const id = field.text.toLowerCase();
  return !!field.definition.complexChoices?.some(
    (c) => c.source !== "custom" && c.id.toLowerCase() === id,
  );
}

export function capitalizeFields(properties: FieldSet): void {
  for (const field of properties.values()) {
    capitalizeField(field);
  }
}

// The folder's own fields and those of its files, for when the folder is displayed
export function capitalizeFolder(folder: Folder | undefined): void {
  if (!folder) return;
  capitalizeFields(folder.properties);
  for (const file of folder.files) {
    if (file !== folder.metadataFile) capitalizeFields(file.properties);
  }
}
