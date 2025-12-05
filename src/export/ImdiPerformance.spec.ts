/**
 * Performance profiling tests for IMDI export.
 *
 * These tests help identify bottlenecks in the IMDI export pipeline.
 * Run with: yarn test src/export/ImdiPerformance.spec.ts
 *
 * The IMDI export has several stages that could be slow:
 * 1. XML Generation (ImdiGenerator.generateSession) - building XML string
 * 2. XML Validation (validateImdiAsyncInternal) - validating against XSD schema
 * 3. File I/O - writing files to disk
 * 4. IPC overhead - renderer <-> main process communication
 *
 * This test focuses on #1 and #2 since they happen in the renderer process
 * and are called once per session.
 */

import { describe, it, beforeAll, expect, afterAll } from "vitest";
import * as temp from "temp";
import { Project } from "../model/Project/Project";
import ImdiGenerator, { IMDIMode } from "./ImdiGenerator";
import { validateImdiAsyncInternal } from "../mainProcess/validateImdi";
import { Session } from "../model/Project/Session/Session";
import * as Path from "path";

// Number of iterations for timing measurements
const TIMING_ITERATIONS = 10;

// Timing helper
const measureTime = async <T>(
  fn: () => Promise<T> | T,
  iterations: number = 1
): Promise<{ result: T; avgMs: number; totalMs: number }> => {
  const start = performance.now();
  let result: T;
  for (let i = 0; i < iterations; i++) {
    result = await fn();
  }
  const totalMs = performance.now() - start;
  return { result: result!, avgMs: totalMs / iterations, totalMs };
};

describe("IMDI Export Performance Profiling", () => {
  let project: Project;
  let session: Session;
  let projectDir: string;

  beforeAll(async () => {
    temp.track();
    projectDir = temp.mkdirSync("lameta-perf-test");

    // Create a project with realistic data
    project = Project.fromDirectory(projectDir);
    project.properties.setText("title", "Performance Test Project");
    project.properties.setText("collectionDescription", "A test project for measuring IMDI export performance");
    project.properties.setText("country", "United States");
    project.properties.setText("continent", "North America");

    // Add a session with realistic metadata
    session = project.addSession();
    session.properties.setText("id", "PERF-TEST-001");
    session.properties.setText("title", "Performance Test Session");
    session.properties.setText("description", "A session with realistic metadata for performance testing. This description is intentionally longer to simulate real-world usage patterns where researchers include detailed notes about the session content, participants, and context.");
    session.properties.setText("date", "2024-01-15");
    session.properties.setText("genre", "narrative");
    session.properties.setText("location", "Test Location");
    session.properties.setText("locationCountry", "United States");
    session.properties.setText("locationContinent", "North America");

    // Add some test files to the session (metadata only, no actual files needed for XML generation)
    await session.addFileForTestAsync("test-audio.wav");
    await session.addFileForTestAsync("test-transcript.eaf");
  });

  afterAll(() => {
    temp.cleanupSync();
  });

  describe("XML Generation Performance", () => {
    it("measures time to generate session IMDI XML", async () => {
      const { avgMs, totalMs } = await measureTime(
        () => ImdiGenerator.generateSession(IMDIMode.RAW_IMDI, session, project),
        TIMING_ITERATIONS
      );

      console.log(`\n📊 Session XML Generation (${TIMING_ITERATIONS} iterations):`);
      console.log(`   Average: ${avgMs.toFixed(2)}ms per session`);
      console.log(`   Total: ${totalMs.toFixed(2)}ms`);

      // XML generation should be fast - under 50ms per session
      // If this regresses to >100ms, something is wrong (likely expensive serialization)
      expect(avgMs).toBeLessThan(50);
    });

    it("measures time to generate corpus IMDI XML", async () => {
      const childrenSubpaths = ["test/Session1.imdi", "test/Session2.imdi"];

      const { avgMs, totalMs } = await measureTime(
        () => ImdiGenerator.generateCorpus(IMDIMode.RAW_IMDI, project, childrenSubpaths),
        TIMING_ITERATIONS
      );

      console.log(`\n📊 Corpus XML Generation (${TIMING_ITERATIONS} iterations):`);
      console.log(`   Average: ${avgMs.toFixed(2)}ms`);
      console.log(`   Total: ${totalMs.toFixed(2)}ms`);

      expect(avgMs).toBeLessThan(50);
    });

    it("measures time to generate OPEX-wrapped session XML", async () => {
      const { avgMs, totalMs } = await measureTime(
        () => ImdiGenerator.generateSession(IMDIMode.OPEX, session, project),
        TIMING_ITERATIONS
      );

      console.log(`\n📊 OPEX Session XML Generation (${TIMING_ITERATIONS} iterations):`);
      console.log(`   Average: ${avgMs.toFixed(2)}ms per session`);
      console.log(`   Total: ${totalMs.toFixed(2)}ms`);

      expect(avgMs).toBeLessThan(50);
    });
  });

  describe("XML Validation Performance", () => {
    let sessionImdiXml: string;
    let corpusImdiXml: string;
    const appPath = ""; // In test environment, schemas are at root

    beforeAll(() => {
      sessionImdiXml = ImdiGenerator.generateSession(IMDIMode.RAW_IMDI, session, project);
      corpusImdiXml = ImdiGenerator.generateCorpus(IMDIMode.RAW_IMDI, project, ["test/Session1.imdi"]);
    });

    it("measures time to validate session IMDI XML", async () => {
      const { avgMs, totalMs, result } = await measureTime(
        () => validateImdiAsyncInternal(appPath, sessionImdiXml),
        TIMING_ITERATIONS
      );

      console.log(`\n📊 Session XML Validation (${TIMING_ITERATIONS} iterations):`);
      console.log(`   Average: ${avgMs.toFixed(2)}ms per session`);
      console.log(`   Total: ${totalMs.toFixed(2)}ms`);
      console.log(`   Valid: ${result.valid}`);

      // If validation is the bottleneck, this will be slow
      // Ideal: <50ms, Acceptable: <200ms, Problem: >500ms
      if (avgMs > 500) {
        console.log(`   ⚠️ SLOW! Validation is likely the bottleneck.`);
      } else if (avgMs > 200) {
        console.log(`   ⚠️ Validation is somewhat slow.`);
      } else {
        console.log(`   ✅ Validation is fast.`);
      }

      expect(result.valid).toBe(true);
    });

    it("measures time to validate corpus IMDI XML", async () => {
      const { avgMs, totalMs, result } = await measureTime(
        () => validateImdiAsyncInternal(appPath, corpusImdiXml),
        TIMING_ITERATIONS
      );

      console.log(`\n📊 Corpus XML Validation (${TIMING_ITERATIONS} iterations):`);
      console.log(`   Average: ${avgMs.toFixed(2)}ms`);
      console.log(`   Total: ${totalMs.toFixed(2)}ms`);
      console.log(`   Valid: ${result.valid}`);

      expect(result.valid).toBe(true);
    });

    it("measures time to validate OPEX-wrapped IMDI XML", async () => {
      const opexXml = ImdiGenerator.generateSession(IMDIMode.OPEX, session, project);

      const { avgMs, totalMs, result } = await measureTime(
        () => validateImdiAsyncInternal(appPath, opexXml),
        TIMING_ITERATIONS
      );

      console.log(`\n📊 OPEX XML Validation (${TIMING_ITERATIONS} iterations):`);
      console.log(`   Average: ${avgMs.toFixed(2)}ms per session`);
      console.log(`   Total: ${totalMs.toFixed(2)}ms`);
      console.log(`   Valid: ${result.valid}`);

      // OPEX validation may be slower because it validates against 2 schemas
      if (avgMs > 1000) {
        console.log(`   ⚠️ VERY SLOW! OPEX validation needs optimization.`);
      }

      expect(result.valid).toBe(true);
    });
  });

  describe("Combined Generation + Validation Performance", () => {
    const appPath = "";

    it("measures total time for session export (generation + validation)", async () => {
      const { avgMs, totalMs } = await measureTime(async () => {
        const xml = ImdiGenerator.generateSession(IMDIMode.RAW_IMDI, session, project);
        const result = await validateImdiAsyncInternal(appPath, xml);
        return result;
      }, TIMING_ITERATIONS);

      console.log(`\n📊 Total Session Export Time (${TIMING_ITERATIONS} iterations):`);
      console.log(`   Average: ${avgMs.toFixed(2)}ms per session`);
      console.log(`   Total: ${totalMs.toFixed(2)}ms`);

      // If this is ~1500ms, then we've found the bottleneck
      if (avgMs > 1000) {
        console.log(`   🔴 This matches the reported ~1.5s/session slowdown!`);
      } else if (avgMs > 500) {
        console.log(`   🟡 Slower than ideal, but not matching reported issue.`);
      } else {
        console.log(`   🟢 Fast! The bottleneck may be elsewhere (IPC, file I/O).`);
      }
    });

    it("measures total time for OPEX export (generation + validation)", async () => {
      const { avgMs, totalMs } = await measureTime(async () => {
        const xml = ImdiGenerator.generateSession(IMDIMode.OPEX, session, project);
        const result = await validateImdiAsyncInternal(appPath, xml);
        return result;
      }, TIMING_ITERATIONS);

      console.log(`\n📊 Total OPEX Session Export Time (${TIMING_ITERATIONS} iterations):`);
      console.log(`   Average: ${avgMs.toFixed(2)}ms per session`);
      console.log(`   Total: ${totalMs.toFixed(2)}ms`);

      if (avgMs > 1000) {
        console.log(`   🔴 This matches the reported ~1.5s/session slowdown!`);
      }
    });
  });

  describe("Breakdown Analysis", () => {
    const appPath = "";

    it("provides detailed breakdown of export time", async () => {
      console.log("\n" + "=".repeat(60));
      console.log("📈 DETAILED PERFORMANCE BREAKDOWN");
      console.log("=".repeat(60));

      // Measure generation
      const genTime = await measureTime(
        () => ImdiGenerator.generateSession(IMDIMode.RAW_IMDI, session, project),
        TIMING_ITERATIONS
      );

      // Measure validation
      const xml = genTime.result;
      const valTime = await measureTime(
        () => validateImdiAsyncInternal(appPath, xml),
        TIMING_ITERATIONS
      );

      const totalAvg = genTime.avgMs + valTime.avgMs;
      const genPercent = ((genTime.avgMs / totalAvg) * 100).toFixed(1);
      const valPercent = ((valTime.avgMs / totalAvg) * 100).toFixed(1);

      console.log(`\n   XML Generation: ${genTime.avgMs.toFixed(2)}ms (${genPercent}%)`);
      console.log(`   XML Validation: ${valTime.avgMs.toFixed(2)}ms (${valPercent}%)`);
      console.log(`   ─────────────────────────────────`);
      console.log(`   Total:          ${totalAvg.toFixed(2)}ms per session`);

      if (valTime.avgMs > genTime.avgMs * 5) {
        console.log(`\n   💡 Recommendation: Validation is the bottleneck.`);
        console.log(`      Consider caching xmllint-wasm initialization.`);
        console.log(`      Or skip validation in non-ELAR exports.`);
      } else if (genTime.avgMs > 100) {
        console.log(`\n   💡 Recommendation: XML generation is slow.`);
        console.log(`      Consider optimizing xmlbuilder usage.`);
      }

      console.log("=".repeat(60) + "\n");
    });
  });
});
