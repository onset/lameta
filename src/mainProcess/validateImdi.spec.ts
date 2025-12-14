import { vi, describe, it, beforeAll, beforeEach, expect } from "vitest";
import { validateImdiAsyncInternal } from "./validateImdi";
import { XMLValidationResult } from "xmllint-wasm";
const appPath = ""; // in test environment this is just the root, so the schemas are in schemas/IMDI_3.0.xsd
describe("validateImdiAsyncInternal", () => {
  it("smoke test with valid imdi", async () => {
    const imdiContents = `<?xml version="1.0"?>
    <METATRANSCRIPT xmlns="http://www.mpi.nl/IMDI/Schema/IMDI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.mpi.nl/IMDI/Schema/IMDI_3.0.xsd" Type="CORPUS" Version="0" Date="2023-11-25" Originator="lameta 2.1.2-alpha" FormatId="IMDI 3.0">
      <Corpus>
        <Name>0257-IGS0048</Name>
        <Title>Documentation of Blablanga</Title>
        <Description>This deposit contains digital audio and video recordings of Blablanga (Blanga) speakers or ritual performers as well as digital photographs, annotations and written notes, and includes a balanced proportion of elicited data, grammaticality judgements, dialogues, conversation, narrative, hortatory, procedural, expository, and descriptive texts, tokens for phonetic analysis as well as ethnographic, sociological and cultural information, customs, rituals, songs, and dances.</Description>
        <CorpusLink Name="OtherDocuments">0257-IGS0048/OtherDocuments.imdi</CorpusLink>
      </Corpus>
    </METATRANSCRIPT>`;

    const result = await validateImdiAsyncInternal(appPath, imdiContents);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("smoke test with invalid imdi", async () => {
    const imdiContents = `<?xml version="1.0"?>
    <METATRANSCRIPT xmlns="http://www.mpi.nl/IMDI/Schema/IMDI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.mpi.nl/IMDI/Schema/IMDI_3.0.xsd" Type="CORPUS" Version="0" Date="2023-11-25" Originator="lameta 2.1.2-alpha" FormatId="IMDI 3.0">
    <IDontBelong/></METATRANSCRIPT>`;

    const result = await validateImdiAsyncInternal(appPath, imdiContents);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    // assert that the error has the string "foo"
    expect(result.errors[0].message).toContain("IDontBelong");
  });

  it("smoke test with valid opex and valid imdi inside", async () => {
    const imdiContents = `<?xml version="1.0"?>
  <opex:OPEXMetadata xmlns:opex="http://www.openpreservationexchange.org/opex/v1.2">
    <opex:DescriptiveMetadata>
      <METATRANSCRIPT xmlns="http://www.mpi.nl/IMDI/Schema/IMDI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.mpi.nl/IMDI/Schema/IMDI_3.0.xsd" Type="CORPUS" Version="0" Date="2023-12-18" Originator="lameta 2.2.0-alpha" FormatId="IMDI 3.0">
        <Corpus>
          <Name>Foo</Name>
          <Title/>
          <Description>The Etoro, or Edolo, are a tribe and ethnic group of the Southern Highlands Province of Papua New Guinea. Their territory comprises the southern slopes of Mt. Sisa, along the southern edge of the central mountain range of New Guinea, near the Papuan Plateau.</Description>
        </Corpus>
      </METATRANSCRIPT>
    </opex:DescriptiveMetadata>
  </opex:OPEXMetadata>`;

    const result = await validateImdiAsyncInternal(appPath, imdiContents);
    expectValid(result);
  });
  it("smoke test with invalid imdi inside of opex", async () => {
    const imdiContents = `<?xml version="1.0"?>
      <opex:OPEXMetadata xmlns:opex="http://www.openpreservationexchange.org/opex/v1.2">
        <opex:DescriptiveMetadata>
          <METATRANSCRIPT xmlns="http://www.mpi.nl/IMDI/Schema/IMDI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="schemas/IMDI_3.0.xsd" Type="CORPUS" Version="0" Date="2023-12-18" Originator="lameta 2.2.0-alpha" FormatId="IMDI 3.0">
            <IDontBelong/>
          </METATRANSCRIPT>
        </opex:DescriptiveMetadata>
      </opex:OPEXMetadata>`;

    const result = await validateImdiAsyncInternal(appPath, imdiContents);

    expectInvalid(result);
    // assert that the error has the string "foo"
    expect(result.errors[0].message).toContain("IDontBelong");
  });

  // Test for LAM-118: OPEX validation never triggered due to checking imdiContents instead of fileContents
  // https://linear.app/lameta/issue/LAM-118
  // The bug was that the code checked `imdiContents.indexOf("OPEXMetadata")` but imdiContents
  // only contains the extracted <METATRANSCRIPT> element, which never contains "OPEXMetadata".
  // The check should be on `fileContents` to detect when OPEX wrapper is present.
  it("detects invalid OPEX structure even when IMDI inside is valid", async () => {
    // This OPEX has Properties before Transfer, which violates the OPEX schema
    // (Transfer should come before Properties according to OPEX-Metadata.xsd)
    const invalidOpexValidImdi = `<?xml version="1.0"?>
<opex:OPEXMetadata xmlns:opex="http://www.openpreservationexchange.org/opex/v1.2">
  <opex:Properties>
    <opex:Title>Wrong order</opex:Title>
  </opex:Properties>
  <opex:Transfer>
    <opex:SourceID>123</opex:SourceID>
  </opex:Transfer>
  <opex:DescriptiveMetadata>
    <METATRANSCRIPT xmlns="http://www.mpi.nl/IMDI/Schema/IMDI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.mpi.nl/IMDI/Schema/IMDI_3.0.xsd" Type="CORPUS" Version="0" Date="2023-12-18" Originator="lameta" FormatId="IMDI 3.0">
      <Corpus>
        <Name>TestCorpus</Name>
        <Title/>
        <Description>Test</Description>
      </Corpus>
    </METATRANSCRIPT>
  </opex:DescriptiveMetadata>
</opex:OPEXMetadata>`;

    const result = await validateImdiAsyncInternal(
      appPath,
      invalidOpexValidImdi
    );

    // Should fail because OPEX structure is invalid (Properties before Transfer)
    expectInvalid(result);
  });
});

function expectValid(result: XMLValidationResult) {
  if (!result.valid) {
    console.log(result.errors);
  }
  expect(result.valid).toBe(true);
  expect(result.errors).toHaveLength(0);
}

function expectInvalid(result: XMLValidationResult) {
  if (result.valid) {
    expect("valid").toBe("invalid");
  }
  expect(result.valid).toBe(false);
}

describe("validateImdiAsyncInternal with ELAR schema", () => {
  it("ELAR schema allows multiple Genre elements with LanguageId", async () => {
    // This would be invalid with standard IMDI schema but valid with ELAR's extended schema
    const imdiContents = `<?xml version="1.0"?>
    <METATRANSCRIPT xmlns="http://www.mpi.nl/IMDI/Schema/IMDI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.mpi.nl/IMDI/Schema/IMDI_3.0.xsd" Type="SESSION" Version="0" Date="2023-11-25" Originator="lameta 2.1.2-alpha" FormatId="IMDI 3.0">
      <Session>
        <Name>test</Name>
        <Title>Test Session</Title>
        <Date>2023-11-25</Date>
        <MDGroup>
          <Location>
            <Continent>Oceania</Continent>
            <Country>Papua New Guinea</Country>
          </Location>
          <Project>
            <Name>Test</Name>
            <Title>Test Project</Title>
            <Id>TEST001</Id>
            <Contact><Name/><Address/><Email/><Organisation/></Contact>
          </Project>
          <Keys/>
          <Content>
            <Genre LanguageId="ISO639-1:en" Link="http://www.mpi.nl/IMDI/Schema/Content-Genre.xml" Type="OpenVocabulary">Narrative</Genre>
            <Genre LanguageId="ISO639-1:es" Link="http://www.mpi.nl/IMDI/Schema/Content-Genre.xml" Type="OpenVocabulary">Narrativa</Genre>
            <Genre LanguageId="ISO639-1:pt" Link="http://www.mpi.nl/IMDI/Schema/Content-Genre.xml" Type="OpenVocabulary">Narrativa</Genre>
            <CommunicationContext/>
            <Languages/>
            <Keys/>
          </Content>
          <Actors/>
        </MDGroup>
        <Resources/>
      </Session>
    </METATRANSCRIPT>`;

    const result = await validateImdiAsyncInternal(
      appPath,
      imdiContents,
      "IMDI_3.0_elar.xsd"
    );
    expectValid(result);
  });

  it("standard schema rejects multiple Genre elements", async () => {
    // The standard schema only allows one Genre element
    const imdiContents = `<?xml version="1.0"?>
    <METATRANSCRIPT xmlns="http://www.mpi.nl/IMDI/Schema/IMDI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.mpi.nl/IMDI/Schema/IMDI_3.0.xsd" Type="SESSION" Version="0" Date="2023-11-25" Originator="lameta 2.1.2-alpha" FormatId="IMDI 3.0">
      <Session>
        <Name>test</Name>
        <Title>Test Session</Title>
        <Date>2023-11-25</Date>
        <MDGroup>
          <Location>
            <Continent>Oceania</Continent>
            <Country>Papua New Guinea</Country>
          </Location>
          <Project>
            <Name>Test</Name>
            <Title>Test Project</Title>
            <Id>TEST001</Id>
            <Contact><Name/><Address/><Email/><Organisation/></Contact>
          </Project>
          <Keys/>
          <Content>
            <Genre Link="http://www.mpi.nl/IMDI/Schema/Content-Genre.xml" Type="OpenVocabulary">Narrative</Genre>
            <Genre Link="http://www.mpi.nl/IMDI/Schema/Content-Genre.xml" Type="OpenVocabulary">Narrativa</Genre>
            <CommunicationContext/>
            <Languages/>
            <Keys/>
          </Content>
          <Actors/>
        </MDGroup>
        <Resources/>
      </Session>
    </METATRANSCRIPT>`;

    // Use the standard schema (default)
    const result = await validateImdiAsyncInternal(appPath, imdiContents);
    expectInvalid(result);
    expect(result.errors[0].message).toContain("Genre");
  });
});
