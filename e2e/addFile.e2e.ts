import { test, expect as expect } from "@playwright/test";
import { Lameta } from "./Lameta";
import { E2eProject } from "./e2eProject";

test("after adding a file, it shows in the list", async ({}, testInfo) => {
  const lameta = new Lameta();
  const page = await lameta.launchAndCreateToNewProject(testInfo);
  const project = new E2eProject(lameta);
  await project.goToSessions();
  await project.addSession();
  await project.addFile("text=foo.txt");
  //await page.pause();
  await expect(page.getByRole("gridcell", { name: "foo.txt" })).toBeVisible();
  // now leave and come back, should still be there
  await project.goToPeople();
  await project.goToSessions();
  await expect(page.getByRole("gridcell", { name: "foo.txt" })).toBeVisible();
  await lameta.quit();
});
