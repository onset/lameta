import * as fs from "fs-extra";
import * as Path from "path";
import * as temp from "temp";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import {
  getFakeCloudProviderIfActive,
  getFakeCloudSyncRootsIfActive,
  resetFakeCloudProviderForTests
} from "./fakeCloudProvider";

function writeManifest(manifest: unknown): string {
  const dir = temp.mkdirSync();
  const manifestPath = Path.join(dir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  return manifestPath;
}

describe("fakeCloudProvider", () => {
  const originalEnv = process.env.E2E_FAKE_CLOUD_PROVIDER;

  beforeEach(() => {
    resetFakeCloudProviderForTests();
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.E2E_FAKE_CLOUD_PROVIDER;
    } else {
      process.env.E2E_FAKE_CLOUD_PROVIDER = originalEnv;
    }
    resetFakeCloudProviderForTests();
    vi.useRealTimers();
  });

  it("is inactive (undefined) when the env var is not set", () => {
    delete process.env.E2E_FAKE_CLOUD_PROVIDER;
    expect(getFakeCloudProviderIfActive()).toBeUndefined();
    expect(getFakeCloudSyncRootsIfActive()).toBeUndefined();
  });

  it("reports cloudOnly for manifest-listed files and local for everything else", () => {
    const cloudOnlyPath = "/fake/root/session/audio.mp3";
    process.env.E2E_FAKE_CLOUD_PROVIDER = writeManifest({
      syncRoots: [{ path: "/fake/root", providerName: "FakeDrive" }],
      cloudOnly: [cloudOnlyPath],
      hydrateDelayMs: 500
    });

    const provider = getFakeCloudProviderIfActive();
    expect(provider).toBeDefined();
    expect(provider!.capabilities).toEqual({ canPin: false, canFetch: true });
    expect(provider!.getStatus(cloudOnlyPath)).toBe("cloudOnly");
    expect(provider!.getStatus("/fake/root/session/other-file.txt")).toBe(
      "local"
    );

    expect(getFakeCloudSyncRootsIfActive()).toEqual([
      { path: "/fake/root", providerName: "FakeDrive" }
    ]);
  });

  it("compares paths case-insensitively, like the real providers", () => {
    const cloudOnlyPath = "/Fake/Root/Session/Audio.mp3";
    process.env.E2E_FAKE_CLOUD_PROVIDER = writeManifest({
      syncRoots: [{ path: "/Fake/Root", providerName: "FakeDrive" }],
      cloudOnly: [cloudOnlyPath],
      hydrateDelayMs: 500
    });

    const provider = getFakeCloudProviderIfActive()!;
    expect(provider.getStatus("/fake/root/session/audio.mp3")).toBe(
      "cloudOnly"
    );
  });

  it("loads the manifest only once -- a later rewrite of the file is not picked up", () => {
    const cloudOnlyPath = "/fake/root/session/audio.mp3";
    const manifestPath = writeManifest({
      syncRoots: [{ path: "/fake/root", providerName: "FakeDrive" }],
      cloudOnly: [cloudOnlyPath],
      hydrateDelayMs: 500
    });
    process.env.E2E_FAKE_CLOUD_PROVIDER = manifestPath;

    const provider = getFakeCloudProviderIfActive()!;
    expect(provider.getStatus(cloudOnlyPath)).toBe("cloudOnly");

    // Rewrite the manifest with a different file marked cloud-only instead.
    fs.writeFileSync(
      manifestPath,
      JSON.stringify({
        syncRoots: [{ path: "/fake/root", providerName: "FakeDrive" }],
        cloudOnly: ["/fake/root/session/other.mp3"],
        hydrateDelayMs: 500
      })
    );

    // Still using the manifest cached at first use.
    expect(provider.getStatus(cloudOnlyPath)).toBe("cloudOnly");
    expect(getFakeCloudProviderIfActive()!.getStatus(cloudOnlyPath)).toBe(
      "cloudOnly"
    );
  });

  it("setPinned(true) moves a cloud-only file to hydrating, then to local after hydrateDelayMs", () => {
    vi.useFakeTimers();
    const cloudOnlyPath = "/fake/root/session/audio.mp3";
    process.env.E2E_FAKE_CLOUD_PROVIDER = writeManifest({
      syncRoots: [{ path: "/fake/root", providerName: "FakeDrive" }],
      cloudOnly: [cloudOnlyPath],
      hydrateDelayMs: 500
    });

    const provider = getFakeCloudProviderIfActive()!;
    provider.setPinned(cloudOnlyPath, true);
    expect(provider.getStatus(cloudOnlyPath)).toBe("hydrating");

    vi.advanceTimersByTime(499);
    expect(provider.getStatus(cloudOnlyPath)).toBe("hydrating");

    vi.advanceTimersByTime(1);
    expect(provider.getStatus(cloudOnlyPath)).toBe("local");
  });

  it("setPinned(false) while hydrating cancels back to cloudOnly", () => {
    vi.useFakeTimers();
    const cloudOnlyPath = "/fake/root/session/audio.mp3";
    process.env.E2E_FAKE_CLOUD_PROVIDER = writeManifest({
      syncRoots: [{ path: "/fake/root", providerName: "FakeDrive" }],
      cloudOnly: [cloudOnlyPath],
      hydrateDelayMs: 500
    });

    const provider = getFakeCloudProviderIfActive()!;
    provider.setPinned(cloudOnlyPath, true);
    expect(provider.getStatus(cloudOnlyPath)).toBe("hydrating");

    provider.setPinned(cloudOnlyPath, false);
    expect(provider.getStatus(cloudOnlyPath)).toBe("cloudOnly");

    // The cancelled timer must not still fire and flip it to local later.
    vi.advanceTimersByTime(1000);
    expect(provider.getStatus(cloudOnlyPath)).toBe("cloudOnly");
  });

  it("setPinned(false) never dehydrates a file that already became local", async () => {
    vi.useFakeTimers();
    const cloudOnlyPath = "/fake/root/session/audio.mp3";
    process.env.E2E_FAKE_CLOUD_PROVIDER = writeManifest({
      syncRoots: [{ path: "/fake/root", providerName: "FakeDrive" }],
      cloudOnly: [cloudOnlyPath],
      hydrateDelayMs: 500
    });

    const provider = getFakeCloudProviderIfActive()!;
    provider.setPinned(cloudOnlyPath, true);
    vi.advanceTimersByTime(500);
    expect(provider.getStatus(cloudOnlyPath)).toBe("local");

    await provider.setPinned(cloudOnlyPath, false);
    expect(provider.getStatus(cloudOnlyPath)).toBe("local");
  });
});
