import { describe, expect, it } from "vite-plus/test";
import { statusIconPath } from "./statusIconPath";

const choices = ["Incoming", "In_Progress", "Finished", "Skipped"];

describe("statusIconPath", () => {
  it("gives each status in the list its own icon", () => {
    expect(statusIconPath("In_Progress", choices)).toBe("assets/status-In_Progress.png");
  });

  it("gives a status outside the list the warning icon", () => {
    expect(statusIconPath("Waiting for consultant", choices)).toBe("assets/warning.png");
    expect(statusIconPath("", choices)).toBe("assets/warning.png");
  });
});
