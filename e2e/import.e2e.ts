import { test, expect as expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { launchWithProject, E2eProject } from "./various-e2e-helpers";
import fs from "fs";
import * as Path from "path";
import { E2eFileList } from "./FileList-e2e-helpers";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

test.describe("Import Session", () => {
  test.beforeAll(async ({}) => {
    lameta = new LametaE2ERunner();
    project = await launchWithProject(lameta, "Import Session");
    page = lameta.page;
  });
  test.afterAll(async ({}) => {
    await lameta.quit();
  });
  test("Smoke test", async ({}, testInfo) => {
    await project.goToSessions();
    //const fileList = new E2eFileList(lameta, page, project.projectDirectory);

    await lameta.clickMenu("Session", "Import Spreadsheet of Sessions...");
    const csvPath = Path.join(process.env.E2ERoot!, "test.csv");
    fs.writeFileSync(
      csvPath,
      `date,title,filename,access_AILCA,access_AILLA,access_ANLA,access_ELAR,access_PARADISEC,access_TLA,access_REAP,access_custom,access_explanation,genre,description,location_region,location_continent,location_country,location_local,archive_repository,,subgenre,topic,keywords,involvement,planning,social_context,subject_languages,working_languages,video,microphone,audio,other_equipment,recording_conditions,participant_1_full_name,participant_1_role,participant_2_full_name,participant_2_role,participant_3_full_name,participant_3_role,participant_4_full_name,participant_4_role,participant_5_full_name,participant_5_role
6/10/2021,Normal,take.mp3,f,Level 1: Public access,Time Limit,O,O,Protected,EnTiTy,red,some reason,Conversation,,,Australia,,,,,,,???,,,,,,,Zoom,,,,Joe Strummer,Recorder,Mick Jones,,Paul Simonon,,Nicky Headon,,Terry Chimes,
,without date,session two,bogus,,,U,,Institution,REAP users,,another explanation,Rap,this is fun,,Gondwana,,,,,,,,,,,,,,,,,,Vince White,,,,,,,,,
9/10/2020,without filename,,,,,S,C,,,green,,,,,,,,,,,,,,,,,,,,,,,Mick Jones,Author,,,,,,,,
9/11/2020,,without title,RC,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,Joe Strummer,Recorder,,,,,,,,
9/12/2020,Minim�qui�dolore�ex�eu�pariatur�eu�cupidatat�sint�esse�dolore�elit�labore�proident�officia.,something,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
Yesterday,This one has a bad date,foobar,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
`
    );
    await lameta.mockShowOpenDialog([csvPath]);
    await page.getByRole("button", { name: "Choose File" }).click();
    const importButton = await page.getByTestId("import");
    await expect(importButton).toBeEnabled();
    await importButton.click();

    // Next step: we need a way to look at the folders that are now available
  });
});
