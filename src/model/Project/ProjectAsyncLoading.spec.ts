import { describe, it, expect } from "vitest";
import fs from "fs";
import { Project } from "./Project";
import path from "path";

// Skip this suite if the optional Large Sample fixtures are not present locally
const largeSamplePath = path.resolve("sample data", "Large Sample");
const hasLargeSample = fs.existsSync(largeSamplePath);

describe("Project Async Loading", () => {
  describe("countFoldersInDirectory", () => {
    it("should count sessions and people folders in Edolo sample", () => {
      const counts = Project.countFoldersInDirectory("sample data/Edolo sample");
      expect(counts.sessionCount).toBe(1);
      expect(counts.personCount).toBe(3);
    });

    it("should return 0 for non-existent directories", () => {
      const counts = Project.countFoldersInDirectory("sample data/NonExistent");
      expect(counts.sessionCount).toBe(0);
      expect(counts.personCount).toBe(0);
    });
  });

  describe("fromDirectoryAsync", () => {
    it("should load Edolo sample project asynchronously", async () => {
      const progressCalls: Array<{
        phase: "sessions" | "people";
        overallCurrent: number;
        overallTotal: number;
      }> = [];

      const project = await Project.fromDirectoryAsync(
        "sample data/Edolo sample",
        (progress) => {
          progressCalls.push({ ...progress });
        }
      );

      // Verify project loaded correctly
      expect(project).toBeDefined();
      expect(project.loadingError).toBeUndefined();
      expect(project.sessions.items.length).toBe(1);
      expect(project.persons.items.length).toBe(3);

      // With batched yields (every 5 items), small projects may have few or no progress calls
      // but the final session update should still happen
      // Total items = 1 session + 3 people = 4 (under batch size of 5)
      // So we only get the final session progress update
      expect(progressCalls.length).toBeGreaterThanOrEqual(1);

      // Verify overall progress never goes backwards
      let previousOverallCurrent = 0;
      for (const call of progressCalls) {
        expect(call.overallCurrent).toBeGreaterThanOrEqual(previousOverallCurrent);
        previousOverallCurrent = call.overallCurrent;
      }
    });

    it("should work without a progress callback", async () => {
      const project = await Project.fromDirectoryAsync("sample data/Edolo sample");

      expect(project).toBeDefined();
      expect(project.loadingError).toBeUndefined();
      expect(project.sessions.items.length).toBe(1);
      expect(project.persons.items.length).toBe(3);
    });
  });

  // Additional tests for Large Sample if available
  (hasLargeSample ? describe : describe.skip)(
    "fromDirectoryAsync with Large Sample",
    () => {
      it("should load Large Sample project asynchronously with progress", async () => {
        const progressCalls: Array<{
          phase: "sessions" | "people";
          overallCurrent: number;
          overallTotal: number;
        }> = [];

        const project = await Project.fromDirectoryAsync(
          "sample data/Large Sample",
          (progress) => {
            progressCalls.push({ ...progress });
          }
        );

        // Verify project loaded correctly
        expect(project).toBeDefined();
        expect(project.loadingError).toBeUndefined();

        // Large Sample has 19 people and many sessions
        expect(project.persons.items.length).toBe(19);
        expect(project.sessions.items.length).toBeGreaterThan(10);

        // With batched yields, we should have fewer progress calls than total items
        // but still enough to show meaningful progress
        expect(progressCalls.length).toBeGreaterThan(0);

        // Verify progress never goes backwards
        let previousOverallCurrent = 0;
        for (const call of progressCalls) {
          expect(call.overallCurrent).toBeGreaterThanOrEqual(previousOverallCurrent);
          previousOverallCurrent = call.overallCurrent;
        }
      });

      it("should count folders correctly in Large Sample", () => {
        const counts = Project.countFoldersInDirectory("sample data/Large Sample");
        expect(counts.sessionCount).toBeGreaterThan(10);
        expect(counts.personCount).toBe(19);
      });
    }
  );
});
