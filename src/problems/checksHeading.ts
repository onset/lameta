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
// such as `required` or `pattern`, that lameta's own fields.json5 does not give it. A
// rule that is off, such as `required: false`, counts only where lameta's turns it on.
export function configurationChangesChecks(
  settings: { checks?: object } | undefined,
  // the parsed fields.json5 of the configuration, and of lameta, if they have one
  fields: Record<string, unknown> | undefined,
  lametaFields: Record<string, unknown> | undefined,
): boolean {
  if (Object.keys(settings?.checks ?? {}).length > 0) return true;
  const definitionsOf = (catalog: Record<string, unknown> | undefined, section: string) => {
    const definitions = catalog?.[section];
    return Array.isArray(definitions)
      ? (definitions.filter((d) => typeof d === "object" && d !== null) as Record<
          string,
          unknown
        >[])
      : [];
  };
  const isOff = (value: unknown) =>
    value === undefined || value === null || value === false || value === "";
  return Object.keys(fields ?? {}).some((section) =>
    definitionsOf(fields, section).some((definition) => {
      const lameta = definitionsOf(lametaFields, section).find((d) => d.key === definition.key);
      return kFieldRules.some((rule) => {
        const value = definition[rule];
        const lametaValue = lameta?.[rule];
        if (isOff(value) && isOff(lametaValue)) return false;
        return rule in definition && JSON.stringify(value) !== JSON.stringify(lametaValue);
      });
    }),
  );
}
