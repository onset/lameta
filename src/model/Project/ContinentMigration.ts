import { FieldDefinition } from "../field/FieldDefinition";

const americasOnlyLegacyValues = new Set([
  "north-america",
  "middle-america",
  "south-america"
]);

function isAmericasOnlyChoices(choices: string[] | undefined): boolean {
  if (!choices || choices.length === 0) {
    return false;
  }
  const hasAmericas = choices.includes("Americas");
  const hasLegacyValues = choices.some((choice) =>
    americasOnlyLegacyValues.has(choice.toLowerCase())
  );
  return hasAmericas && !hasLegacyValues;
}

export function normalizeContinentValueForAmericasOnly(
  fieldDefinitions: FieldDefinition[],
  fieldKey: string,
  value: string
): string {
  const definition = fieldDefinitions.find((field) => field.key === fieldKey);
  if (!definition || !isAmericasOnlyChoices(definition.choices)) {
    return value;
  }
  const normalizedKey = value.trim().toLowerCase().replace(/\s+/g, "-");
  if (americasOnlyLegacyValues.has(normalizedKey)) {
    return "Americas";
  }
  return value;
}
