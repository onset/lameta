import rocrate from "ro-crate";

export type ValidationEntry = {
  id: string;
  status: "error" | "warning" | "info";
  message: string;
  clause: string;
};

export type ValidationResult = {
  errors: ValidationEntry[];
  warnings: ValidationEntry[];
  info: ValidationEntry[];
};

/**
 * Validates an RO-Crate JSON object using the ro-crate library
 * @param json The RO-Crate JSON object to validate
 * @returns A promise that resolves to an array of validation entries
 */
export const validateRoCrate = async (
  json: object
): Promise<ValidationEntry[]> => {
  return await rocrate.validate(json);
};

/**
 * Validates an RO-Crate JSON object and categorizes results by severity
 * @param json The RO-Crate JSON object to validate
 * @returns A promise that resolves to validation results categorized by severity
 */
export const validateRoCrateWithCategories = async (
  json: object
): Promise<ValidationResult> => {
  try {
    const entries = await rocrate.validate(json);
    return {
      errors: entries.filter((entry) => entry.status === "error"),
      warnings: entries.filter((entry) => entry.status === "warning"),
      info: entries.filter((entry) => entry.status === "info")
    };
  } catch (e) {
    return {
      errors: [
        {
          message: `${e.message} ${e.stack || ""}`,
          id: "validation-error",
          status: "error",
          clause: "validation-exception"
        }
      ],
      warnings: [],
      info: []
    };
  }
};
