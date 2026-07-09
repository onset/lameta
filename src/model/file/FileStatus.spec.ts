import { describe, it, expect } from "vitest";
import { OtherFile } from "./File";
import { getStatusOfFile, getLinkStatusIconPath } from "./FileStatus";
import * as fs from "fs-extra";
import * as temp from "temp";
import { EncounteredVocabularyRegistry } from "../Project/EncounteredVocabularyRegistry";
import { i18nUnitTestPrep } from "../../other/localization";
i18nUnitTestPrep();

function getPretendFile(): OtherFile {
  const path = temp.path({ suffix: ".mp3" }) as string;
  fs.writeFileSync(path, "pretend contents");
  return new OtherFile(path, new EncounteredVocabularyRegistry());
}

describe("getStatusOfFile / getLinkStatusIconPath for cloud-only files", () => {
  it("reports cloudOnly, and not missing, when cloudStatus is cloudOnly", () => {
    const f = getPretendFile();
    f.cloudStatus = "cloudOnly";
    const status = getStatusOfFile(f);
    expect(status.missing).toBe(false);
    expect(status.status).toBe("cloudOnly");
  });

  it("also reports cloudOnly while hydrating", () => {
    const f = getPretendFile();
    f.cloudStatus = "hydrating";
    expect(getStatusOfFile(f).status).toBe("cloudOnly");
  });

  it("does not report cloudOnly for a normal local file", () => {
    const f = getPretendFile();
    f.cloudStatus = "local";
    expect(getStatusOfFile(f).status).not.toBe("cloudOnly");
  });

  it("returns no icon path for cloudOnly: cloud states are drawn by CloudStatusIcon", () => {
    const f = getPretendFile();
    f.cloudStatus = "cloudOnly";
    expect(getLinkStatusIconPath(f)).toBe("");
  });
});
