/**
 * A simple collector for export warnings that can be used instead of NotifyWarning
 * during export operations. This allows warnings to be funneled to the export dialog
 * log instead of showing as toast notifications.
 *
 * ## Usage Pattern
 *
 * **IMPORTANT**: Callers MUST ensure `stopCollectingWarnings()` is called even if
 * the export operation fails. Use a try/finally block or the `withWarningCollection`
 * helper to guarantee cleanup:
 *
 * ```typescript
 * // Option 1: Manual try/finally
 * startCollectingWarnings();
 * try {
 *   await doExport();
 * } finally {
 *   const warnings = stopCollectingWarnings();
 *   // handle warnings
 * }
 *
 * // Option 2: Use the helper (recommended)
 * const warnings = await withWarningCollection(async () => {
 *   await doExport();
 * });
 * ```
 *
 * If cleanup is not performed, the collector remains in a collecting state and
 * the deduplication set will grow unbounded.
 */

let currentWarnings: string[] = [];
let seenWarnings: Set<string> = new Set();
let isCollecting = false;

/**
 * Internal function to perform cleanup and reset state.
 */
const resetCollectorState = () => {
  isCollecting = false;
  const warnings = [...currentWarnings];
  currentWarnings = [];
  seenWarnings = new Set();
  return warnings;
};

/**
 * Start collecting warnings. Call this before starting an export operation.
 *
 * **IMPORTANT**: You MUST call `stopCollectingWarnings()` when done, even if an error
 * occurs. Use a try/finally block or the `withWarningCollection` helper.
 */
export const startCollectingWarnings = () => {
  // Clear any existing state from a previous incomplete collection
  resetCollectorState();

  currentWarnings = [];
  seenWarnings = new Set();
  isCollecting = true;
};

/**
 * Stop collecting warnings and return the collected warnings.
 * After this call, any new warnings will go to NotifyWarning as usual.
 *
 * **IMPORTANT**: This MUST be called after starting collection, even if an error occurs.
 * Failure to call this will leave the collector in a collecting state and cause the
 * deduplication set to grow unbounded until the safety timeout triggers.
 */
export const stopCollectingWarnings = (): string[] => {
  return resetCollectorState();
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

/**
 * Result type for withWarningCollection helper.
 */
export interface WarningCollectionResult<T> {
  /** The result of the operation, if successful */
  result: T;
  /** Warnings collected during the operation */
  warnings: string[];
}

/**
 * Execute an async operation while collecting warnings, ensuring cleanup on both
 * success and error paths.
 *
 * This is the recommended way to use warning collection as it guarantees
 * cleanup via a finally block internally.
 *
 * @param operation - The async operation to execute while collecting warnings
 * @returns An object containing the operation result and collected warnings
 * @throws Re-throws any error from the operation after cleanup
 *
 * @example
 * ```typescript
 * const { result, warnings } = await withWarningCollection(async () => {
 *   return await performExport();
 * });
 * // warnings are guaranteed to be collected even if performExport() throws
 * ```
 */
export const withWarningCollection = async <T>(
  operation: () => Promise<T>
): Promise<WarningCollectionResult<T>> => {
  startCollectingWarnings();
  try {
    const result = await operation();
    return { result, warnings: stopCollectingWarnings() };
  } catch (error) {
    // Collect warnings before re-throwing so they're available in error handlers
    const warnings = stopCollectingWarnings();
    // Attach warnings to the error if it's an Error object, for potential recovery
    if (error instanceof Error) {
      (error as Error & { collectedWarnings?: string[] }).collectedWarnings =
        warnings;
    }
    throw error;
  }
};
