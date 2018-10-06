import ImdiGenerator from "./ImdiGenerator";
import { Project } from "../model/Project/Project";
import { Person } from "../model/Project/Person/Person";
import {
  setResultXml,
  xexpect as expect,
  count,
  value
} from "./xmlUnitTestUtils";
import LanguageFinder from "../components/LanguagePickerDialog/LanguageFinder";

let project: Project;
let person: Person;

beforeAll(() => {
  project = Project.fromDirectory("sample data/Edolo sample");
  person = Person.fromDirectory("sample data/Edolo sample/People/Awi Heole");
  const subsetLanguageFinder = new LanguageFinder([
    {
      name: "Edolo",
      code: { three: "etr" },
      macro: false,
      countries: [],
      altNames: ["Etoro"],
      country: "Papua New Guinea"
    },
    {
      name: "Tok Pisin",
      code: { three: "tpi" },
      altNames: [],
      country: "Papua New Guinea"
    },
    {
      name: "Huli",
      code: { three: "hui" },
      altNames: ["Huri"],
      country: "Papua New Guinea"
    }
  ]);

  const generator = new ImdiGenerator(person, project, subsetLanguageFinder);
  setResultXml(
    generator.actor(person, "pretend-role") as string
    // ImdiGenerator.generateActor(
    //   person,
    //   project,
    //   true /*omit namespace*/,
    //   subsetLanguageFinder
    // )
  );
});
beforeEach(() => {});

describe("actor imdi export", () => {
  it("should contain Actor", () => {
    expect("Actor/Name").toMatch("Awi Heole");
    expect(count("Actor/Languages/Language")).toBe(3);
  });
  it("should label languages correctly", () => {
    expect("Actor/Languages/Language[1]/Id").toHaveText("ISO639-3:etr");
    expect("Actor/Languages/Language[2]/Id").toHaveText("ISO639-3:tpi");
    expect("Actor/Languages/Language[3]/Id").toHaveText("ISO639-3:hui");

    expect(
      "Actor/Languages/Language[Name[text()='Edolo']]/PrimaryLanguage[text()='true']"
    ).toHaveCount(1);

    /* "Mother Tongue" doesn't actually mean "mother's language". SM doesn't have a way to express MT at the moment.
    expect(
      "Actor/Languages/Language[Name[text()='Edolo']]/MotherTongue[text()='true']"
    ).toHaveCount(1);
    expect(
        "Actor/Languages/Language[Name[text()='Huli']]/MotherTongue[text()='false']"
    ).toHaveCount(1);*/
    expect(
      "Actor/Languages/Language[Name[text()='Huli']]/PrimaryLanguage[text()='false']"
    ).toHaveCount(1);
  });
});
