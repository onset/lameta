/**
 * A simple collector for export warnings that can be used instead of NotifyWarning
 * during export operations. This allows warnings to be funneled to the export dialog
 * log instead of showing as toast notifications.
 */

let currentWarnings: string[] = [];
let isCollecting = false;

/**
 * Start collecting warnings. Call this before starting an export operation.
 */
export const startCollectingWarnings = () => {
  currentWarnings = [];
  isCollecting = true;
};

/**
 * Stop collecting warnings and return the collected warnings.
 * After this call, any new warnings will go to NotifyWarning as usual.
 */
export const stopCollectingWarnings = (): string[] => {
  isCollecting = false;
  const warnings = [...currentWarnings];
  currentWarnings = [];
  return warnings;
};

/**
 * Get warnings collected so far (without stopping collection).
 */
export const getCollectedWarnings = (): string[] => {
  return [...currentWarnings];
};

/**
 * Clear collected warnings without stopping collection.
 */
export const clearCollectedWarnings = () => {
  currentWarnings = [];
};

/**
 * Add a warning. If collecting, adds to the collection.
 * Returns true if the warning was collected, false if it should be shown via NotifyWarning.
 */
export const collectExportWarning = (message: string): boolean => {
  if (isCollecting) {
    currentWarnings.push(message);
    return true;
  }
  return false;
};

/**
 * Check if we're currently collecting warnings.
 */
export const isCollectingWarnings = (): boolean => {
  return isCollecting;
};
