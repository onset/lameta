/**
 * A simple collector for export warnings that can be used instead of NotifyWarning
 * during export operations. This allows warnings to be funneled to the export dialog
 * log instead of showing as toast notifications.
 */

let currentWarnings: string[] = [];
let seenWarnings: Set<string> = new Set();
let isCollecting = false;

/**
 * Start collecting warnings. Call this before starting an export operation.
 */
export const startCollectingWarnings = () => {
  currentWarnings = [];
  seenWarnings = new Set();
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
  seenWarnings = new Set();
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
 * Note: This only clears the warnings list, not the deduplication set,
 * so the same warning won't be added again even after clearing.
 */
export const clearCollectedWarnings = () => {
  currentWarnings = [];
  // Don't clear seenWarnings - we want to keep deduplicating across the entire export
};

/**
 * Add a warning. If collecting, adds to the collection (deduplicated).
 * Returns true if the warning was collected, false if it should be shown via NotifyWarning.
 */
export const collectExportWarning = (message: string): boolean => {
  if (isCollecting) {
    // Deduplicate: only add if we haven't seen this exact message before
    if (!seenWarnings.has(message)) {
      seenWarnings.add(message);
      currentWarnings.push(message);
    }
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
