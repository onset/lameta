import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  startCollectingWarnings,
  stopCollectingWarnings,
  collectExportWarning,
  isCollectingWarnings,
  getCollectedWarnings,
  clearCollectedWarnings,
  withWarningCollection
} from "./ExportWarningCollector";

describe("ExportWarningCollector", () => {
  beforeEach(() => {
    // Ensure clean state before each test
    stopCollectingWarnings();
  });

  afterEach(() => {
    // Ensure clean state after each test
    stopCollectingWarnings();
  });

  describe("basic collection", () => {
    it("should collect warnings when collecting is active", () => {
      startCollectingWarnings();
      expect(collectExportWarning("test warning")).toBe(true);
      const warnings = stopCollectingWarnings();
      expect(warnings).toEqual(["test warning"]);
    });

    it("should not collect warnings when collecting is inactive", () => {
      expect(collectExportWarning("test warning")).toBe(false);
    });

    it("should deduplicate identical warnings", () => {
      startCollectingWarnings();
      collectExportWarning("duplicate warning");
      collectExportWarning("duplicate warning");
      collectExportWarning("different warning");
      const warnings = stopCollectingWarnings();
      expect(warnings).toEqual(["duplicate warning", "different warning"]);
    });

    it("should track collecting state correctly", () => {
      expect(isCollectingWarnings()).toBe(false);
      startCollectingWarnings();
      expect(isCollectingWarnings()).toBe(true);
      stopCollectingWarnings();
      expect(isCollectingWarnings()).toBe(false);
    });
  });

  describe("getCollectedWarnings", () => {
    it("should return current warnings without stopping collection", () => {
      startCollectingWarnings();
      collectExportWarning("warning 1");
      expect(getCollectedWarnings()).toEqual(["warning 1"]);
      expect(isCollectingWarnings()).toBe(true);
      collectExportWarning("warning 2");
      expect(getCollectedWarnings()).toEqual(["warning 1", "warning 2"]);
    });
  });

  describe("clearCollectedWarnings", () => {
    it("should clear warnings list but maintain deduplication", () => {
      startCollectingWarnings();
      collectExportWarning("warning 1");
      clearCollectedWarnings();
      expect(getCollectedWarnings()).toEqual([]);
      // Should still be deduplicated
      collectExportWarning("warning 1");
      expect(getCollectedWarnings()).toEqual([]);
      // New warnings should still work
      collectExportWarning("warning 2");
      expect(getCollectedWarnings()).toEqual(["warning 2"]);
    });
  });

  describe("cleanup on error paths", () => {
    it("should reset state when startCollectingWarnings is called without stopCollectingWarnings", () => {
      startCollectingWarnings();
      collectExportWarning("orphaned warning");
      // Simulate a new export starting without proper cleanup
      startCollectingWarnings();
      expect(getCollectedWarnings()).toEqual([]);
      expect(isCollectingWarnings()).toBe(true);
    });

    it("should handle multiple stop calls gracefully", () => {
      startCollectingWarnings();
      collectExportWarning("test warning");
      const warnings1 = stopCollectingWarnings();
      const warnings2 = stopCollectingWarnings();
      expect(warnings1).toEqual(["test warning"]);
      expect(warnings2).toEqual([]);
    });
  });

  describe("withWarningCollection helper", () => {
    it("should collect warnings during successful async operation", async () => {
      const { result, warnings } = await withWarningCollection(async () => {
        collectExportWarning("warning during operation");
        return "success";
      });

      expect(result).toBe("success");
      expect(warnings).toEqual(["warning during operation"]);
      expect(isCollectingWarnings()).toBe(false);
    });

    it("should cleanup and re-throw on error", async () => {
      const testError = new Error("test error");

      await expect(
        withWarningCollection(async () => {
          collectExportWarning("warning before error");
          throw testError;
        })
      ).rejects.toThrow("test error");

      expect(isCollectingWarnings()).toBe(false);
    });

    it("should attach collected warnings to error object", async () => {
      const testError = new Error("test error");

      try {
        await withWarningCollection(async () => {
          collectExportWarning("warning 1");
          collectExportWarning("warning 2");
          throw testError;
        });
      } catch (e: unknown) {
        expect(
          (e as Error & { collectedWarnings?: string[] }).collectedWarnings
        ).toEqual(["warning 1", "warning 2"]);
      }
    });

    it("should deduplicate warnings within the helper", async () => {
      const { warnings } = await withWarningCollection(async () => {
        collectExportWarning("duplicate");
        collectExportWarning("duplicate");
        collectExportWarning("unique");
        return null;
      });

      expect(warnings).toEqual(["duplicate", "unique"]);
    });
  });
});
