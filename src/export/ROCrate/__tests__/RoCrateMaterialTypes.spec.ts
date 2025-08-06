import { describe, it, expect } from "vitest";
import {
  getLdacMaterialType,
  getLdacMaterialTypeForPath
} from "../RoCrateMaterialTypes";

describe("getLdacMaterialType", () => {
  it("should return ldac:PrimaryMaterial for audio files", () => {
    expect(getLdacMaterialType("Audio")).toBe("ldac:PrimaryMaterial");
  });

  it("should return ldac:PrimaryMaterial for video files", () => {
    expect(getLdacMaterialType("Video")).toBe("ldac:PrimaryMaterial");
  });

  it("should return ldac:PrimaryMaterial for image files", () => {
    expect(getLdacMaterialType("Image")).toBe("ldac:PrimaryMaterial");
  });

  it("should return ldac:Annotation for ELAN files", () => {
    expect(getLdacMaterialType("ELAN")).toBe("ldac:Annotation");
  });

  it("should return ldac:Annotation for CHAT files", () => {
    expect(getLdacMaterialType("CHAT")).toBe("ldac:Annotation");
  });

  it("should return ldac:Annotation for document files", () => {
    expect(getLdacMaterialType("Doc")).toBe("ldac:Annotation");
  });

  it("should return ldac:Annotation for Toolbox files", () => {
    expect(getLdacMaterialType("Toolbox")).toBe("ldac:Annotation");
  });

  it("should return ldac:Annotation for Praat files", () => {
    expect(getLdacMaterialType("Praat")).toBe("ldac:Annotation");
  });

  it("should return ldac:Annotation for FLEx files", () => {
    expect(getLdacMaterialType("FLEx")).toBe("ldac:Annotation");
  });

  it("should return ldac:Annotation for unknown file types", () => {
    expect(getLdacMaterialType("Unknown")).toBe("ldac:Annotation");
  });

  it("should return ldac:Annotation for empty string", () => {
    expect(getLdacMaterialType("")).toBe("ldac:Annotation");
  });

  it("should return ldac:Annotation for undefined input", () => {
    expect(getLdacMaterialType(undefined as any)).toBe("ldac:Annotation");
  });
});

describe("getLdacMaterialTypeForPath", () => {
  it("should return ldac:PrimaryMaterial for audio file paths", () => {
    expect(getLdacMaterialTypeForPath("audio.mp3")).toBe(
      "ldac:PrimaryMaterial"
    );
    expect(getLdacMaterialTypeForPath("/path/to/recording.wav")).toBe(
      "ldac:PrimaryMaterial"
    );
  });

  it("should return ldac:PrimaryMaterial for video file paths", () => {
    expect(getLdacMaterialTypeForPath("video.mp4")).toBe(
      "ldac:PrimaryMaterial"
    );
    expect(getLdacMaterialTypeForPath("/path/to/session.avi")).toBe(
      "ldac:PrimaryMaterial"
    );
  });

  it("should return ldac:PrimaryMaterial for image file paths", () => {
    expect(getLdacMaterialTypeForPath("photo.jpg")).toBe(
      "ldac:PrimaryMaterial"
    );
    expect(getLdacMaterialTypeForPath("/people/person_photo.png")).toBe(
      "ldac:PrimaryMaterial"
    );
  });

  it("should return ldac:Annotation for annotation file paths", () => {
    expect(getLdacMaterialTypeForPath("transcription.eaf")).toBe(
      "ldac:Annotation"
    );
    expect(getLdacMaterialTypeForPath("analysis.cha")).toBe("ldac:Annotation");
    expect(getLdacMaterialTypeForPath("document.pdf")).toBe("ldac:Annotation");
  });

  it("should return ldac:Annotation for unknown file extensions", () => {
    expect(getLdacMaterialTypeForPath("unknown.xyz")).toBe("ldac:Annotation");
  });
});
