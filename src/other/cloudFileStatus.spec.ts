import { describe, it, expect, afterEach, vi } from "vitest";
import {
  getCloudFileStatus,
  getCloudFileProvider,
  setAttributeReaderForTests,
  setPinWriterForTests,
  isLocallyAvailable,
  isUnderCloudSyncRoot,
  getCloudProviderNameForPath,
  parseSyncRootManagerOutput,
  setCloudSyncRootsForTests,
  statusFromMacStat,
  providerNameFromCloudStorageDir,
  setMacStatReaderForTests,
  setICloudSiblingCheckerForTests,
  setMaterializerForTests
} from "./cloudFileStatus";

describe("getCloudFileStatus", () => {
  afterEach(() => {
    setAttributeReaderForTests(undefined);
    setPinWriterForTests(undefined);
  });

  it("returns cloudOnly when IS_OFFLINE and IS_RECALL_ON_DATA_ACCESS are set", () => {
    setAttributeReaderForTests(() => ({
      IS_OFFLINE: true,
      IS_RECALL_ON_DATA_ACCESS: true,
      IS_RECALL_ON_OPEN: false,
      IS_PINNED: false
    }));
    expect(getCloudFileStatus("C:\\fake\\path.mp3")).toBe("cloudOnly");
  });

  it("returns cloudOnly when only IS_RECALL_ON_OPEN is set", () => {
    setAttributeReaderForTests(() => ({
      IS_OFFLINE: false,
      IS_RECALL_ON_DATA_ACCESS: false,
      IS_RECALL_ON_OPEN: true,
      IS_PINNED: false
    }));
    expect(getCloudFileStatus("C:\\fake\\path.mp3")).toBe("cloudOnly");
  });

  it("returns local when attributes indicate a normal, hydrated file", () => {
    setAttributeReaderForTests(() => ({
      IS_OFFLINE: false,
      IS_RECALL_ON_DATA_ACCESS: false,
      IS_RECALL_ON_OPEN: false
    }));
    expect(getCloudFileStatus("C:\\fake\\path.mp3")).toBe("local");
  });

  it("returns unknown when the reader returns undefined", () => {
    setAttributeReaderForTests(() => undefined);
    expect(getCloudFileStatus("C:\\fake\\path.mp3")).toBe("unknown");
  });

  it("returns unknown when the reader throws", () => {
    setAttributeReaderForTests(() => {
      throw new Error("boom");
    });
    expect(getCloudFileStatus("C:\\fake\\path.mp3")).toBe("unknown");
  });

  it("returns hydrating when placeholder attrs are set and IS_PINNED is true", () => {
    setAttributeReaderForTests(() => ({
      IS_OFFLINE: true,
      IS_RECALL_ON_DATA_ACCESS: false,
      IS_RECALL_ON_OPEN: false,
      IS_PINNED: true
    }));
    expect(getCloudFileStatus("C:\\fake\\path.mp3")).toBe("hydrating");
  });

  it("returns cloudOnly when placeholder attrs are set and IS_PINNED is false", () => {
    setAttributeReaderForTests(() => ({
      IS_OFFLINE: true,
      IS_RECALL_ON_DATA_ACCESS: false,
      IS_RECALL_ON_OPEN: false,
      IS_PINNED: false
    }));
    expect(getCloudFileStatus("C:\\fake\\path.mp3")).toBe("cloudOnly");
  });

  it("returns localPinned when no placeholder attrs are set and IS_PINNED is true", () => {
    setAttributeReaderForTests(() => ({
      IS_OFFLINE: false,
      IS_RECALL_ON_DATA_ACCESS: false,
      IS_RECALL_ON_OPEN: false,
      IS_PINNED: true
    }));
    expect(getCloudFileStatus("C:\\fake\\path.mp3")).toBe("localPinned");
  });
});

describe("getCloudFileProvider().setPinned", () => {
  afterEach(() => {
    setAttributeReaderForTests(undefined);
    setPinWriterForTests(undefined);
  });

  it("calls the writer with (path, true) when pinning", async () => {
    const writer = vi.fn().mockResolvedValue(undefined);
    setPinWriterForTests(writer);

    await getCloudFileProvider().setPinned("C:\\fake\\path.mp3", true);

    expect(writer).toHaveBeenCalledWith("C:\\fake\\path.mp3", true);
  });

  it("calls the writer with (path, false) when unpinning", async () => {
    const writer = vi.fn().mockResolvedValue(undefined);
    setPinWriterForTests(writer);

    await getCloudFileProvider().setPinned("C:\\fake\\path.mp3", false);

    expect(writer).toHaveBeenCalledWith("C:\\fake\\path.mp3", false);
  });

  it("propagates a rejection from the writer", async () => {
    setPinWriterForTests(() => Promise.reject(new Error("write failed")));

    await expect(
      getCloudFileProvider().setPinned("C:\\fake\\path.mp3", true)
    ).rejects.toThrow(/write failed/);
  });

  it("reports canPin true when the attribute-reader seam is set", () => {
    setAttributeReaderForTests(() => undefined);
    expect(getCloudFileProvider().capabilities.canPin).toBe(true);
  });
});

describe("isLocallyAvailable", () => {
  it("is true only for the two hydrated states", () => {
    expect(isLocallyAvailable("local")).toBe(true);
    expect(isLocallyAvailable("localPinned")).toBe(true);
    expect(isLocallyAvailable("cloudOnly")).toBe(false);
    expect(isLocallyAvailable("hydrating")).toBe(false);
    expect(isLocallyAvailable("unknown")).toBe(false);
  });
});

describe("isUnderCloudSyncRoot", () => {
  afterEach(() => {
    setCloudSyncRootsForTests(undefined);
  });

  it("matches files under a sync root, case- and separator-insensitively", () => {
    setCloudSyncRootsForTests(["C:\\Users\\me\\OneDrive"]);
    expect(isUnderCloudSyncRoot("C:\\Users\\me\\OneDrive\\proj\\a.mp3")).toBe(
      true
    );
    expect(isUnderCloudSyncRoot("c:/users/me/onedrive/proj/a.mp3")).toBe(true);
  });

  it("does not match sibling folders that merely share the root as a name prefix", () => {
    setCloudSyncRootsForTests(["C:\\Users\\me\\OneDrive"]);
    expect(
      isUnderCloudSyncRoot("C:\\Users\\me\\OneDriveBackup\\a.mp3")
    ).toBe(false);
    expect(isUnderCloudSyncRoot("C:\\Elsewhere\\a.mp3")).toBe(false);
  });

  it("tolerates a trailing slash on the configured root", () => {
    setCloudSyncRootsForTests(["C:\\Users\\me\\OneDrive\\"]);
    expect(isUnderCloudSyncRoot("C:\\Users\\me\\OneDrive\\a.mp3")).toBe(true);
  });

  it("returns false when there are no sync roots", () => {
    setCloudSyncRootsForTests([]);
    expect(isUnderCloudSyncRoot("C:\\Users\\me\\OneDrive\\a.mp3")).toBe(false);
  });
});

describe("getCloudProviderNameForPath", () => {
  afterEach(() => {
    setCloudSyncRootsForTests(undefined);
  });

  it("names the sync engine that owns the path", () => {
    setCloudSyncRootsForTests([
      { path: "C:\\Users\\me\\Dropbox", providerName: "Dropbox" },
      { path: "C:\\Users\\me\\OneDrive", providerName: "OneDrive" }
    ]);
    expect(
      getCloudProviderNameForPath("C:\\Users\\me\\Dropbox\\proj\\a.mp3")
    ).toBe("Dropbox");
    expect(
      getCloudProviderNameForPath("C:\\Users\\me\\OneDrive\\proj\\a.mp3")
    ).toBe("OneDrive");
    expect(getCloudProviderNameForPath("C:\\Elsewhere\\a.mp3")).toBeUndefined();
  });
});

describe("parseSyncRootManagerOutput", () => {
  // Trimmed-down copy of real `reg query ...\SyncRootManager /s` output from
  // a machine with both OneDrive and Dropbox.
  const regOutput = [
    "",
    "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\SyncRootManager\\Dropbox!S-1-5-21-111!dbid:AADS_xyz",
    "    NamespaceCLSID    REG_SZ    {6539AFDE-D4FB-4757-91E5-373C2132F6A0}",
    "    DisplayNameResource    REG_EXPAND_SZ    Dropbox",
    "    IconResource    REG_EXPAND_SZ    C:\\Program Files (x86)\\Dropbox\\Client\\Dropbox.exe,-6001",
    "",
    "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\SyncRootManager\\Dropbox!S-1-5-21-111!dbid:AADS_xyz\\UserSyncRoots",
    "    S-1-5-21-111    REG_SZ    C:\\Users\\me\\Dropbox",
    "",
    "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\SyncRootManager\\OneDrive!S-1-5-21-111!Personal|ae8e",
    "    DisplayNameResource    REG_SZ    OneDrive - Personal",
    "    IconResource    REG_SZ    C:\\Program Files\\Microsoft OneDrive\\OneDrive.exe,-501",
    "",
    "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\SyncRootManager\\OneDrive!S-1-5-21-111!Personal|ae8e\\UserSyncRoots",
    "    S-1-5-21-111    REG_SZ    C:\\Users\\me\\OneDrive",
    ""
  ].join("\r\n");

  it("finds each provider's sync root with a friendly name", () => {
    expect(parseSyncRootManagerOutput(regOutput)).toEqual([
      { path: "C:\\Users\\me\\Dropbox", providerName: "Dropbox" },
      { path: "C:\\Users\\me\\OneDrive", providerName: "OneDrive" }
    ]);
  });

  it("does not mistake other REG_SZ values (icons, CLSIDs) for sync roots", () => {
    const roots = parseSyncRootManagerOutput(regOutput);
    expect(roots).toHaveLength(2);
    expect(roots.every((r) => !r.path.includes(".exe"))).toBe(true);
  });

  it("maps known program ids to friendly names and passes unknown ones through", () => {
    const output = [
      "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\SyncRootManager\\GoogleDrive!S-1-5-21-111!acct\\UserSyncRoots",
      "    S-1-5-21-111    REG_SZ    G:\\My Drive",
      "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\SyncRootManager\\pCloud!S-1-5-21-111!acct\\UserSyncRoots",
      "    S-1-5-21-111    REG_SZ    P:\\pCloud Drive"
    ].join("\r\n");
    expect(parseSyncRootManagerOutput(output)).toEqual([
      { path: "G:\\My Drive", providerName: "Google Drive" },
      { path: "P:\\pCloud Drive", providerName: "pCloud" }
    ]);
  });

  it("returns an empty list for empty or unrelated output", () => {
    expect(parseSyncRootManagerOutput("")).toEqual([]);
  });
});

// --- macOS ---------------------------------------------------------------

describe("statusFromMacStat", () => {
  const base = {
    underSyncRoot: true,
    underICloudRoot: false,
    inFlight: false,
    hasICloudSibling: false
  };

  it("classifies a dataless placeholder (size>0, blocks==0) as cloudOnly", () => {
    expect(
      statusFromMacStat({ isFile: true, size: 100, blocks: 0 }, base)
    ).toBe("cloudOnly");
  });

  it("classifies a dataless placeholder that is in-flight as hydrating", () => {
    expect(
      statusFromMacStat(
        { isFile: true, size: 100, blocks: 0 },
        { ...base, inFlight: true }
      )
    ).toBe("hydrating");
  });

  it("classifies a file with blocks>0 as local", () => {
    expect(
      statusFromMacStat({ isFile: true, size: 100, blocks: 8 }, base)
    ).toBe("local");
  });

  it("treats a zero-length file as local, not a placeholder", () => {
    expect(statusFromMacStat({ isFile: true, size: 0, blocks: 0 }, base)).toBe(
      "local"
    );
  });

  it("classifies a missing file with an .icloud sibling under iCloud as cloudOnly", () => {
    expect(
      statusFromMacStat(undefined, {
        ...base,
        underICloudRoot: true,
        hasICloudSibling: true
      })
    ).toBe("cloudOnly");
  });

  it("classifies a missing+sibling+in-flight iCloud file as hydrating", () => {
    expect(
      statusFromMacStat(undefined, {
        ...base,
        underICloudRoot: true,
        hasICloudSibling: true,
        inFlight: true
      })
    ).toBe("hydrating");
  });

  it("returns unknown for a path not under any sync root", () => {
    expect(
      statusFromMacStat(
        { isFile: true, size: 100, blocks: 0 },
        { ...base, underSyncRoot: false }
      )
    ).toBe("unknown");
  });

  it("returns unknown for a missing file with no iCloud sibling", () => {
    expect(statusFromMacStat(undefined, base)).toBe("unknown");
  });
});

describe("providerNameFromCloudStorageDir", () => {
  it("maps a CloudStorage directory name to a friendly provider name", () => {
    expect(providerNameFromCloudStorageDir("OneDrive-Personal")).toBe(
      "OneDrive"
    );
    expect(
      providerNameFromCloudStorageDir("GoogleDrive-user@gmail.com")
    ).toBe("Google Drive");
    expect(providerNameFromCloudStorageDir("Dropbox-Work")).toBe("Dropbox");
    expect(providerNameFromCloudStorageDir("Box-me@work.com")).toBe("Box");
  });

  it("passes an unknown provider id through unchanged", () => {
    expect(providerNameFromCloudStorageDir("MEGA-foo")).toBe("MEGA");
  });
});

describe("darwin-style sync-root matching", () => {
  afterEach(() => {
    setCloudSyncRootsForTests(undefined);
  });

  it("matches files under a forward-slash root, case-insensitively", () => {
    setCloudSyncRootsForTests([
      { path: "/Users/me/Library/CloudStorage/OneDrive-Personal", providerName: "OneDrive" }
    ]);
    expect(
      isUnderCloudSyncRoot(
        "/Users/me/Library/CloudStorage/OneDrive-Personal/proj/a.mp3"
      )
    ).toBe(true);
    expect(
      getCloudProviderNameForPath(
        "/users/ME/library/cloudstorage/onedrive-personal/proj/a.mp3"
      )
    ).toBe("OneDrive");
  });

  it("does not match a sibling that merely shares the root as a name prefix", () => {
    setCloudSyncRootsForTests([{ path: "/Users/x/OneDrive", providerName: "OneDrive" }]);
    expect(isUnderCloudSyncRoot("/Users/x/OneDriveOther/a.mp3")).toBe(false);
    expect(isUnderCloudSyncRoot("/Users/x/Elsewhere/a.mp3")).toBe(false);
  });

  it("matches a home-dir symlink alias root", () => {
    setCloudSyncRootsForTests([
      { path: "/Users/me/OneDrive", providerName: "OneDrive" }
    ]);
    expect(isUnderCloudSyncRoot("/Users/me/OneDrive/proj/a.mp3")).toBe(true);
  });

  it("matches across NFC/NFD Unicode forms (macOS APIs can return decomposed names)", () => {
    // Root as macOS readdir might report it: "\u00e9" decomposed as "e" + U+0301.
    const nfdRoot = "/Users/me/Library/CloudStorage/OneDrive-Rene\u0301";
    // Path as settings/UI would supply it: precomposed U+00E9.
    const nfcPath = "/Users/me/Library/CloudStorage/OneDrive-Ren\u00e9/proj/a.mp3";
    expect(nfdRoot.includes("\u00e9")).toBe(false); // really different forms
    setCloudSyncRootsForTests([{ path: nfdRoot, providerName: "OneDrive" }]);
    expect(isUnderCloudSyncRoot(nfcPath)).toBe(true);
    expect(getCloudProviderNameForPath(nfcPath)).toBe("OneDrive");
  });
});

describe("MacCloudFileProvider getStatus", () => {
  afterEach(() => {
    setMacStatReaderForTests(undefined);
    setICloudSiblingCheckerForTests(undefined);
    setMaterializerForTests(undefined);
    setCloudSyncRootsForTests(undefined);
  });

  it("reports capabilities canPin=false, canFetch=true", () => {
    setMacStatReaderForTests(() => undefined);
    expect(getCloudFileProvider().capabilities.canPin).toBe(false);
    expect(getCloudFileProvider().capabilities.canFetch).toBe(true);
  });

  it("maps a dataless placeholder under a sync root to cloudOnly", () => {
    setCloudSyncRootsForTests([{ path: "/Users/me/OneDrive", providerName: "OneDrive" }]);
    setMacStatReaderForTests(() => ({ isFile: true, size: 100, blocks: 0 }));
    expect(getCloudFileProvider().getStatus("/Users/me/OneDrive/a.mp3")).toBe(
      "cloudOnly"
    );
  });

  it("maps a hydrated file (blocks>0) to local", () => {
    setCloudSyncRootsForTests([{ path: "/Users/me/OneDrive", providerName: "OneDrive" }]);
    setMacStatReaderForTests(() => ({ isFile: true, size: 100, blocks: 8 }));
    expect(getCloudFileProvider().getStatus("/Users/me/OneDrive/a.mp3")).toBe(
      "local"
    );
  });

  it("returns unknown for a path not under any sync root", () => {
    setCloudSyncRootsForTests([{ path: "/Users/me/OneDrive", providerName: "OneDrive" }]);
    setMacStatReaderForTests(() => ({ isFile: true, size: 100, blocks: 0 }));
    expect(
      getCloudFileProvider().getStatus("/Users/me/Elsewhere/a.mp3")
    ).toBe("unknown");
  });

  it("maps a missing file with an .icloud sibling under an iCloud root to cloudOnly", () => {
    setCloudSyncRootsForTests([
      {
        path: "/Users/me/Library/Mobile Documents/com~apple~CloudDocs",
        providerName: "iCloud Drive"
      }
    ]);
    setMacStatReaderForTests(() => undefined);
    setICloudSiblingCheckerForTests(() => true);
    expect(
      getCloudFileProvider().getStatus(
        "/Users/me/Library/Mobile Documents/com~apple~CloudDocs/a.mp3"
      )
    ).toBe("cloudOnly");
  });

  it("returns unknown for a missing file under an iCloud root with no sibling", () => {
    setCloudSyncRootsForTests([
      {
        path: "/Users/me/Library/Mobile Documents/com~apple~CloudDocs",
        providerName: "iCloud Drive"
      }
    ]);
    setMacStatReaderForTests(() => undefined);
    setICloudSiblingCheckerForTests(() => false);
    expect(
      getCloudFileProvider().getStatus(
        "/Users/me/Library/Mobile Documents/com~apple~CloudDocs/a.mp3"
      )
    ).toBe("unknown");
  });

  it("wraps a stat-reader throw as unknown", () => {
    setCloudSyncRootsForTests([{ path: "/Users/me/OneDrive", providerName: "OneDrive" }]);
    setMacStatReaderForTests(() => {
      throw new Error("boom");
    });
    expect(getCloudFileProvider().getStatus("/Users/me/OneDrive/a.mp3")).toBe(
      "unknown"
    );
  });
});

describe("MacCloudFileProvider setPinned (one-shot materialization)", () => {
  afterEach(() => {
    setMacStatReaderForTests(undefined);
    setMaterializerForTests(undefined);
    setCloudSyncRootsForTests(undefined);
  });

  it("tracks in-flight so a dataless file reads as hydrating, and self-cleans to local", async () => {
    setCloudSyncRootsForTests([{ path: "/Users/me/OneDrive", providerName: "OneDrive" }]);
    const materialize = vi.fn().mockResolvedValue(undefined);
    setMaterializerForTests(materialize);

    let dataless = true;
    setMacStatReaderForTests(() =>
      dataless
        ? { isFile: true, size: 100, blocks: 0 }
        : { isFile: true, size: 100, blocks: 8 }
    );

    const provider = getCloudFileProvider();
    const p = "/Users/me/OneDrive/a.mp3";

    // Before pinning: cloud-only.
    expect(provider.getStatus(p)).toBe("cloudOnly");

    await provider.setPinned(p, true);
    expect(materialize).toHaveBeenCalledWith(p);
    // Now in-flight and still dataless -> hydrating.
    expect(provider.getStatus(p)).toBe("hydrating");

    // Download completes: file now has data. getStatus self-cleans the
    // in-flight entry, so it reads as local.
    dataless = false;
    expect(provider.getStatus(p)).toBe("local");

    // And if it were to appear dataless again, it is no longer in-flight.
    dataless = true;
    expect(provider.getStatus(p)).toBe("cloudOnly");
  });

  it("setPinned(false) clears the in-flight state (back to cloudOnly)", async () => {
    setCloudSyncRootsForTests([{ path: "/Users/me/OneDrive", providerName: "OneDrive" }]);
    setMaterializerForTests(() => Promise.resolve());
    setMacStatReaderForTests(() => ({ isFile: true, size: 100, blocks: 0 }));

    const provider = getCloudFileProvider();
    const p = "/Users/me/OneDrive/b.mp3";

    await provider.setPinned(p, true);
    expect(provider.getStatus(p)).toBe("hydrating");

    await provider.setPinned(p, false);
    expect(provider.getStatus(p)).toBe("cloudOnly");
  });

  it("drops in-flight when the materializer rejects", async () => {
    setCloudSyncRootsForTests([{ path: "/Users/me/OneDrive", providerName: "OneDrive" }]);
    setMaterializerForTests(() => Promise.reject(new Error("nope")));
    setMacStatReaderForTests(() => ({ isFile: true, size: 100, blocks: 0 }));

    const provider = getCloudFileProvider();
    const p = "/Users/me/OneDrive/c.mp3";

    await provider.setPinned(p, true);
    // Let the rejected materialize promise's .catch run.
    await Promise.resolve();
    await Promise.resolve();
    expect(provider.getStatus(p)).toBe("cloudOnly");
  });
});
