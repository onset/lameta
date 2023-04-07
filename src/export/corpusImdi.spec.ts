import ImdiGenerator, { IMDIMode } from "./ImdiGenerator";
import { Project } from "../model/Project/Project";
import {
  setResultXml,
  xexpect as expect,
  count,
  value
} from "../other/xmlUnitTestUtils";
vi.mock("@electron/remote", () => ({ exec: vi.fn() })); //See commit msg for info

let project: Project;

beforeAll(() => {
  project = Project.fromDirectory("sample data/Edolo sample");
  const xml = ImdiGenerator.generateCorpus(
    IMDIMode.RAW_IMDI,
    project,
    ["ETR009.imdi"],
    true
  );
  setResultXml(xml);
});
beforeEach(() => {});

describe("project imdi export", () => {
  it("should contain METATRANSCRIPT/Corpus", () => {
    expect(count("METATRANSCRIPT/Corpus")).toBe(1);
  });
  it("should contain Corpus/Name", () => {
    expect(value("METATRANSCRIPT/Corpus/Name")).toBe("Edolo Sample");
  });

  it("should contain Corpus/Description", () => {
    expect(count("METATRANSCRIPT/Corpus/Description")).toBe(1);
    expect(
      value("METATRANSCRIPT/Corpus/Description").indexOf(
        "The Etoro, or Edolo,"
      ) === 0
    ).toBe(true);
  });
  it("should contain CorpusLinks", () => {
    expect("METATRANSCRIPT/Corpus/CorpusLink").toHaveAttributeValue(
      "Name",
      "ETR009"
    );
    expect("METATRANSCRIPT/Corpus/CorpusLink").toHaveText("ETR009.imdi");
  });
});
