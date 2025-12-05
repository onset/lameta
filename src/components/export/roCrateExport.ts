import { RoCrateValidator } from "../../export/ROCrate/RoCrateValidator";

/**
 * Validates RO-Crate data and throws an error if validation fails.
 */
export const runRoCrateValidation = async (roCrateData: any): Promise<void> => {
  const validator = new RoCrateValidator();
  const result = validator.validate(roCrateData);

  if (result.isValid) {
    return;
  }

  const displayedErrors = result.errors.slice(0, 10);
  const extraCount = result.errors.length - displayedErrors.length;
  const detailLines = displayedErrors.map(
    (error, index) => `${index + 1}. ${error}`
  );

  if (extraCount > 0) {
    detailLines.push(`…and ${extraCount} more.`);
  }
  detailLines.push("See console for full list of errors.");
  console.error("RO-Crate validation errors:", result.errors);

  const message = [
    `RO-Crate validation failed (${result.errors.length} issue${
      result.errors.length === 1 ? "" : "s"
    })`,
    ...detailLines
  ].join("\n");

  throw new Error(message);
};
