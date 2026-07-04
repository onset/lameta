import { describe, it, expect } from "vitest";
import { providerHandlesFile } from "./tabProviderHost";

// The coarse `handles` capability filter: which selections a tab provider gets queried for.
const audio = { extension: "wav", mimeType: "audio/wav", lametaType: "Audio" };
const eaf = { extension: "eaf", mimeType: "application/xml", lametaType: "ELAN" };
const image = { extension: "png", mimeType: "image/png", lametaType: "Image" };

describe("providerHandlesFile", () => {
  it("queries for EVERY file when handles is absent", () => {
    expect(providerHandlesFile(undefined, audio)).toBe(true);
    expect(providerHandlesFile(undefined, image)).toBe(true);
  });

  it("queries for every file when handles has no criteria", () => {
    expect(providerHandlesFile({}, image)).toBe(true);
  });

  it("matches on any single criterion (lametaTypes / extensions / mimePatterns)", () => {
    const handles = { lametaTypes: ["Audio"], extensions: ["eaf"] };
    expect(providerHandlesFile(handles, audio)).toBe(true); // lametaType hit
    expect(providerHandlesFile(handles, eaf)).toBe(true); // extension hit
    expect(providerHandlesFile(handles, image)).toBe(false); // neither
  });

  it("supports mime wildcards", () => {
    expect(
      providerHandlesFile({ mimePatterns: ["audio/*"] }, audio)
    ).toBe(true);
    expect(
      providerHandlesFile({ mimePatterns: ["audio/*"] }, image)
    ).toBe(false);
  });
});
