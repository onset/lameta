import { E2eProject, createNewProject } from "./various-e2e-helpers";
import { test, expect as expect } from "@playwright/test";
import { Page } from "playwright-core";
import { LametaE2ERunner } from "./lametaE2ERunner";
import {
  expectMenuWithLabel,
  shouldAtLeastOnce,
  shouldHaveMultiple,
  shouldSeeExactlyOnce
} from "./e2e.expects";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

/*--------------------------------------------------------- 
 * Playwright's BeforeAll is actually run after each test,
 * so just have one test() function.
 ---------------------------------------------------------*/
test.describe.skip("Localization", () => {
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
    // At the moment the Indonesian translations are changing, as well as the UI,
    // so I've decided to put this test on ice.

    return;

    // menu
    await expectMenuWithLabel(lameta.electronApp, "Lihat");

    // Project, Session, People tabs
    await shouldSeeExactlyOnce(page, ["Proyek", "Sesi", "Orang-Orang"]);
    // tabs in Project
    // await shouldSeeExactlyOnce(page, ["Tentang proyek ini"]);

    // await shouldAtLeastOnce(page, ["pilih..."]);

    // main project page
    // await shouldSeeExactlyOnce(page, [
    //   //"Bahasa yang didokumentasi", // we have a hack to fix the plurality of the key
    //   "Judul Proyek yang Didanai" // regression test
    // ]);

    await project.goToSessions();
    await project.addSession();
    // sessions page

    // session list
    await shouldAtLeastOnce(page, ["Judul"]); // file list header for title

    // buttons above the file lise
    await shouldSeeExactlyOnce(page, ["Buka", "Ubah Nama..."]);

    // files in the session headers
    await shouldSeeExactlyOnce(page, ["Nama", "Tipe"]);
    // tabs of the selected file
    await shouldSeeExactlyOnce(page, ["Catatan"]);
    // some fields
    await shouldSeeExactlyOnce(["Deskripsi", "Kotak-kotak Khusus"]);

    await shouldHaveMultiple(page, "Tanggal", 2); // date

    await project.goToPeople();
    await project.addPerson();

    await shouldSeeExactlyOnce(page, [
      "Nama Lengkap", //name
      "Tahun Lahir", //birth year
      // TODO not finding this link: "Tambah Bahasa", // add language
      "Bagaimaan Cara Menghubungi" // How to Contact
    ]);
  });
});
