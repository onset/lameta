import { t } from "@lingui/core/macro";
import { kFieldRules } from "../model/field/FieldDefinition";

// What the Problems sidebar calls the set of checks that is running: the archive
// configuration's folder name, such as "ELAR Checks", or "Baseline Checks" when the
// project's checks are only lameta's own (see Project.checksConfigurationName).
export function checksHeading(configurationName: string | undefined): string {
  if (!configurationName) {
    return t({
      message: "Baseline Checks",
      comment:
        "Heading of the Problems sidebar when the project has no archive configuration, so lameta runs only its own basic checks",
    });
  }
  return t({
    message: `${configurationName} Checks`,
    comment:
      'Heading of the Problems sidebar. The value is the short name of an archive, as in "ELAR Checks": the checks that this archive asks for',
  });
}

// Whether an archive configuration adds to or changes lameta's own checks: its
// settings.json5 has `checks` of its own, or its fields.json5 gives a field a rule,
// such as `required` or `pattern`
export function configurationChangesChecks(
  settings: { checks?: object } | undefined,
  // the parsed fields.json5, if the configuration has one
  fields: Record<string, unknown> | undefined,
): boolean {
  if (Object.keys(settings?.checks ?? {}).length > 0) return true;
  return Object.values(fields ?? {}).some(
    (definitions) =>
      Array.isArray(definitions) &&
      definitions.some(
        (definition) =>
          typeof definition === "object" &&
          definition !== null &&
          kFieldRules.some((rule) => rule in definition),
      ),
  );
}
