import { t } from "@lingui/core/macro";

// What the Problems sidebar calls the set of checks that is running: the archive
// configuration's folder name, such as "ELAR Checks", or "Baseline Checks" when the
// project uses only lameta's own list (see Project.checksConfigurationName).
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
