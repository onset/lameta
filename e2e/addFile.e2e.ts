import { test, expect as expect } from "@playwright/test";
import { e2eNavigation } from "./navigation";

test("after adding a file, it shows in the list immediately", async ({}, testInfo) => {
  const nav = new e2eNavigation();
  const page = await nav.launchAndCreateToNewProject(testInfo);
  await nav.goToSessions();
  await nav.addSession();
  await nav.addFile("text=foo.txt");
  //await page.pause();
  await expect(page.getByRole("gridcell", { name: "foo.txt" })).toBeVisible();
});
test("after adding a file, it shows in the list after leaving and coming back", async ({}, testInfo) => {
  const nav = new e2eNavigation();
  const page = await nav.launchAndCreateToNewProject(testInfo);
  await nav.goToSessions();
  await nav.addSession();
  await nav.addFile("foo.txt");
  await nav.goToPeople();
  await nav.goToSessions();
  await expect(page.getByRole("gridcell", { name: "foo.txt" })).toBeVisible();
});
