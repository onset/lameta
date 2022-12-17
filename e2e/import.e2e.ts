import { test, expect as expect, Page } from "@playwright/test";
import { Lameta } from "./Lameta";
import { createNewProject, E2eProject } from "./e2eProject";
import * as fs from "fs";
import * as Path from "path";

let lameta: Lameta;
let page: Page;
let project: E2eProject;

// test.describe("Import Session", () => {
//   test.beforeAll(async ({}) => {
//     lameta = new Lameta();
//     page = await lameta.launch();
//     await lameta.cancelRegistration();
//     project = await createNewProject(lameta, "Import Session");
//   });
//   test.afterAll(async ({}) => {
//     lameta.quit();
//   });
//   test("Smoke test", async ({}, testInfo) => {
//     await project.goToSessions();
//     await lameta.clickMenu("session", "import_spreadsheet");
//     const csvPath = Path.join(process.env.E2ERoot!, "test.csv");
//     fs.writeFileSync(
//       csvPath,
//       `date,title,filename,access_AILCA,access_AILLA,access_ANLA,access_ELAR,access_PARADISEC,access_TLA,access_REAP,access_custom,access_explanation,genre,description,location_region,location_continent,location_country,location_local,archive_repository,,subgenre,topic,keywords,involvement,planning,social_context,subject_languages,working_languages,video,microphone,audio,other_equipment,recording_conditions,participant_1_full_name,participant_1_role,participant_2_full_name,participant_2_role,participant_3_full_name,participant_3_role,participant_4_full_name,participant_4_role,participant_5_full_name,participant_5_role
// 6/10/2021,Normal,take.mp3,f,Level 1: Public access,Time Limit,O,O,Protected,EnTiTy,red,some reason,Conversation,,,Australia,,,,,,,???,,,,,,,Zoom,,,,Joe Strummer,Recorder,Mick Jones,,Paul Simonon,,Nicky Headon,,Terry Chimes,
// ,without date,session two,bogus,,,U,,Institution,REAP users,,another explanation,Rap,this is fun,,Gondwana,,,,,,,,,,,,,,,,,,Vince White,,,,,,,,,
// 9/10/2020,without filename,,,,,S,C,,,green,,,,,,,,,,,,,,,,,,,,,,,Mick Jones,Author,,,,,,,,
// 9/11/2020,,without title,RC,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,Joe Strummer,Recorder,,,,,,,,
// 9/12/2020,Minim�qui�dolore�ex�eu�pariatur�eu�cupidatat�sint�esse�dolore�elit�labore�proident�officia.,something,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
// Yesterday,This one has a bad date,foobar,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
// `
//     );
//     lameta.mockShowOpenDialog([csvPath]);

//     await page.getByRole("button", { name: "Choose File" }).click();
//     await page.pause();
//     await page.getByTestId("import").click();
//   });
// });
