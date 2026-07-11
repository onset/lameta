import { describe, it, expect } from "vitest";
import { isCloudProviderReadFailure } from "./cloudReadGuard";

describe("isCloudProviderReadFailure", () => {
  it("returns false for undefined/null errors", () => {
    expect(isCloudProviderReadFailure(undefined)).toBe(false);
    expect(isCloudProviderReadFailure(null)).toBe(false);
  });

  // Windows signature
  it("matches the Windows errno -4094 read signature", () => {
    expect(
      isCloudProviderReadFailure({ errno: -4094, code: "UNKNOWN", syscall: "read" })
    ).toBe(true);
  });

  it("matches the Windows code UNKNOWN read signature even without matching errno", () => {
    expect(
      isCloudProviderReadFailure({ errno: -1, code: "UNKNOWN", syscall: "read" })
    ).toBe(true);
  });

  it("does not match UNKNOWN/errno -4094 on a non-read syscall", () => {
    expect(
      isCloudProviderReadFailure({ errno: -4094, code: "UNKNOWN", syscall: "open" })
    ).toBe(false);
  });

  // macOS signatures
  it("matches EDEADLK on read", () => {
    expect(isCloudProviderReadFailure({ code: "EDEADLK", syscall: "read" })).toBe(
      true
    );
  });

  it("matches EDEADLK on open", () => {
    expect(isCloudProviderReadFailure({ code: "EDEADLK", syscall: "open" })).toBe(
      true
    );
  });

  it("matches ETIMEDOUT on read", () => {
    expect(isCloudProviderReadFailure({ code: "ETIMEDOUT", syscall: "read" })).toBe(
      true
    );
  });

  it("matches EIO on open", () => {
    expect(isCloudProviderReadFailure({ code: "EIO", syscall: "open" })).toBe(true);
  });

  it("does not match EDEADLK on stat", () => {
    expect(isCloudProviderReadFailure({ code: "EDEADLK", syscall: "stat" })).toBe(
      false
    );
  });

  // Plain filesystem errors must never match
  it("does not match ENOENT on read", () => {
    expect(isCloudProviderReadFailure({ code: "ENOENT", syscall: "read" })).toBe(
      false
    );
  });

  it("does not match EBUSY on open", () => {
    expect(isCloudProviderReadFailure({ code: "EBUSY", syscall: "open" })).toBe(
      false
    );
  });

  it("does not match EPERM on read", () => {
    expect(isCloudProviderReadFailure({ code: "EPERM", syscall: "read" })).toBe(
      false
    );
  });

  it("does not match EACCES on open", () => {
    expect(isCloudProviderReadFailure({ code: "EACCES", syscall: "open" })).toBe(
      false
    );
  });
});
