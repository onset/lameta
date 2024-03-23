import { E2eProject, createNewProject } from "./e2eProject";
import { test, expect as expect } from "@playwright/test";
import { Page } from "playwright-core";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { expectMenuWithLabel } from "./e2e.expects";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

/*--------------------------------------------------------- 
 * Playwright's BeforeAll is actually run after each test,
 * so just have one test() function.
 ---------------------------------------------------------*/
test.describe("Localization", () => {
  test.beforeEach(async () => {
    if (!lameta) {
      lameta = new LametaE2ERunner();
      page = await lameta.launch();
      await lameta.cancelRegistration();

      project = await createNewProject(lameta, "Test Localization");
      //await new Promise((resolve) => setTimeout(resolve, 1000));
      await lameta.clickMenu("View", "Interface Language", "Bahasa Indonesia");
      // currently, this is causing a reload of the page which then causes a reguest for registration
      await lameta.cancelRegistration();
    }
  });
  test.afterEach(async () => {
    await lameta.quit();
  });

  test("labels are in Indonesian", async () => {
    // menu
    await expectMenuWithLabel(lameta.electronApp, "Lihat");

    // Project, Session, People tabs
    await shouldSeeExactlyOnce(["Proyek", "Sesi", "Orang-Orang"]);
    // tabs in Project
    await shouldSeeExactlyOnce(["Tentang proyek ini"]);

    await shouldAtLeastOnce(["pilih..."]);

    // main project page
    await project.goToProjectAbout();
    await shouldSeeExactlyOnce([
      "Bahasa yang didokumentasi", // we have a hack to fix the plurality of the key
      "Judul proyek yang didanai" // regression test
    ]);

    await project.goToSessions();
    await project.addSession();
    // sessions page

    // session list
    await shouldAtLeastOnce(["Judul"]); // file list header for title

    // buttons above the file lise
    await shouldSeeExactlyOnce(["Buka", "Ubah Nama..."]);

    // files in the session headers
    await shouldSeeExactlyOnce(["Nama", "Tipe"]);
    // tabs of the selected file
    await shouldSeeExactlyOnce(["Catatan"]);
    // some fields
    await shouldSeeExactlyOnce(["Deskripsi", "Kotak-kotak Khusus"]);

    await shouldHaveMultiple("Tanggal", 2); // date

    await project.goToPeople();
    await project.addPerson();

    await shouldSeeExactlyOnce([
      "Nama Lengkap", //name
      "Tahun Lahir", //birth year
      // TODO not finding this link: "Tambah Bahasa", // add language
      "Bagaimana dihubungi" // How to Contact
    ]);
  });
});

async function shouldSeeExactlyOnce(labels: string[], exact = true) {
  for (const label of labels) {
    await expect(page.getByText(label, { exact: exact })).toBeVisible();
  }
}
async function shouldAtLeastOnce(labels: string[], exact = true) {
  for (const label of labels) {
    await expect(page.getByText(label, { exact: exact })).toBeTruthy();
  }
}
async function shouldHaveMultiple(label: string, count: number, exact = true) {
  const x = await page.getByText(label, { exact: exact });
  const c = await x.count();
  await expect(c).toBe(count);
}
