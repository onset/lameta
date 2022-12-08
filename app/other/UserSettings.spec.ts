import {
  UserSettings,
  getMediaFolderOrEmptyForProjectAndMachine,
  setMediaFolderOrEmptyForProjectAndMachine,
} from "./UserSettings";
jest.mock("@electron/remote", () => ({ exec: jest.fn() })); //See commit msg for info

describe("Round trips media folder in test environment", () => {
  it("roundtrips email", () => {
    const s = new UserSettings();
    s.Email = "foo";

    expect(s.Email).toBe("foo");
  });
  it("normalizePath converts to forward slashes", () => {
    setMediaFolderOrEmptyForProjectAndMachine("foobar", "c:/foo/bar");
    expect(getMediaFolderOrEmptyForProjectAndMachine("foobar")).toBe(
      "c:/foo/bar"
    );
  });
});
