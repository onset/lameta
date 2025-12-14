import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Track all spawnSync calls
let spawnSyncCalls: Array<{ command: string; args: string[] }> = [];

// Mock child_process before importing the module under test
vi.mock("child_process", () => ({
  spawnSync: vi.fn((command: string, args: string[]) => {
    spawnSyncCalls.push({ command, args });
    return { status: 0 };
  })
}));

// Mock fs for controlled behavior
let readFileSyncCallCount = 0;
vi.mock("fs", async (importOriginal) => {
  const originalFs = (await importOriginal()) as typeof import("fs");
  return {
    ...originalFs,
    default: {
      ...originalFs,
      readFileSync: vi.fn((path: string) => {
        readFileSyncCallCount++;
        if (readFileSyncCallCount === 1) {
          // First call: throw EBUSY to trigger sleep
          const error: NodeJS.ErrnoException = new Error("File is busy");
          error.code = "EBUSY";
          throw error;
        }
        // Subsequent calls: succeed
        return "file contents";
      })
    }
  };
});

// We need to mock the Notify functions to prevent UI calls during tests
vi.mock("../components/Notify", () => ({
  NotifyError: vi.fn(),
  NotifyFileAccessProblem: vi.fn(),
  NotifyNoBigDeal: vi.fn(),
  NotifyRenameProblem: vi.fn(),
  NotifyWarning: vi.fn(),
  getCannotRenameFileMsg: vi.fn(() => "Cannot rename file")
}));

vi.mock("@lingui/macro", () => ({
  t: (strings: TemplateStringsArray) => strings[0]
}));

describe("PatientFS", () => {
  beforeEach(() => {
    spawnSyncCalls = [];
    readFileSyncCallCount = 0;
  });

  describe("sleepForShortWhile", () => {
    // LAM-117: Test that ping command arguments are correctly formatted as separate array elements.
    // Bug: Arguments were passed as a single string "-n 2 127.0.0.1" instead of ["-n", "2", "127.0.0.1"]
    // This caused Windows ping to fail silently with "Bad parameter 2" or similar errors.
    // https://linear.app/lameta/issue/LAM-117
    it("should call ping with properly formatted arguments (not as single string)", async () => {
      // Dynamically import after mocks are set up
      const { PatientFS } = await import("./patientFile");

      // Call a method that will trigger the retry mechanism (first call fails with EBUSY, second succeeds)
      const result = PatientFS.readFileSyncWithNotifyAndRethrow("test.txt");

      expect(result).toBe("file contents");

      // Find the ping call
      const pingCall = spawnSyncCalls.find((call) => call.command === "ping");
      expect(pingCall).toBeDefined();

      // The bug: arguments were passed as ["-n 2 127.0.0.1"] (single string)
      // The fix: arguments should be ["-n", "2", "127.0.0.1"] (separate elements)
      const args = pingCall!.args;

      // This assertion will FAIL with the buggy code because args would be ["-n 2 127.0.0.1"]
      // and pass with the fixed code because args would be ["-n", "2", "127.0.0.1"]
      expect(args).toContain("-n");
      expect(args).toContain("2");
      expect(args).toContain("127.0.0.1");
      expect(args.length).toBe(3);

      // Also verify args[0] is NOT the combined string (the bug)
      expect(args[0]).not.toBe("-n 2 127.0.0.1");
    });
  });
});
