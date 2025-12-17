import { test, expect as expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { createNewProject, E2eProject } from "./various-e2e-helpers";
import { E2eFileList } from "./FileList-e2e-helpers";
import { ContributorsHelper } from "./contributors-e2e-helpers";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;
let fileList: E2eFileList;
let contributors: ContributorsHelper;

const arrowDownKey =
  process.platform === "darwin" ? "Meta+ArrowDown" : "Control+ArrowDown";

test.describe("Contributors", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    page = await lameta.launch();
    await lameta.cancelRegistration();
    project = await createNewProject(lameta, "Contributors");
    fileList = new E2eFileList(lameta, page, project.projectDirectory);
    contributors = new ContributorsHelper(page, project);
  });
  test.afterAll(async () => {
    await lameta.quit();
  });

  test.describe("Basic contributor management", () => {
    test("adding a new contributor with name only, then that contributor is available", async () => {
      await project.goToSessions();
      await project.addSession();
      await project.goToContributorsOfThisSession();
      await page.keyboard.press("Tab");
      await page.keyboard.type("foo");
      await page.keyboard.press("Enter");

      // regression test that there is not a second item named just "foo" instead of "foo ?"
      await page.locator(".PersonChooser").first().click();
      await page.keyboard.press(arrowDownKey);
      await expect(page.getByText("foo", { exact: true })).toHaveCount(0);

      await project.goToNotesOfThisSession();
      await project.goToContributorsOfThisSession();
      // open the dropdown
      const name = "foo ❓";
      await page.getByRole("gridcell", { name: name }).click();
      await page.getByRole("option", { name: name }).click();

      //    now try to use it in a new session
      await project.addSession();
      await project.goToContributorsOfThisSession();
      await page.keyboard.press("Tab");
      await page.keyboard.press(arrowDownKey);
      await page.getByRole("option", { name: name }).click();

      await lameta.softReload();

      await project.goToSessions();
      await project.addSession();
      await project.goToContributorsOfThisSession();
      // using the locator, find the first element with class "PersonChooser"
      await page.locator(".PersonChooser").click();
      await page.keyboard.press(arrowDownKey);
      await page.getByRole("option", { name: name }).click();
    });
  });

  test.describe("Role management", () => {
    test("can set a contributor's role", async () => {
      await project.goToSessions();
      await project.addSession();
      await contributors.goToContributorsTab();
      
      // Add a contributor
      await contributors.addContributor("Role Test Person");
      
      // Set the role to Speaker
      await contributors.setRole(0, "Speaker");
      
      // Verify the role is displayed
      const displayedRole = await contributors.getContributorRole(0);
      expect(displayedRole.toLowerCase()).toContain("speaker");
    });

    test("can change a contributor's role", async () => {
      await project.goToSessions();
      await project.addSession();
      await contributors.goToContributorsTab();
      
      // Add a contributor with Speaker role
      await contributors.addContributor("Role Change Person");
      await contributors.setRole(0, "Speaker");
      
      // Change to Researcher
      await contributors.setRole(0, "Researcher");
      
      // Verify the role changed
      const displayedRole = await contributors.getContributorRole(0);
      expect(displayedRole.toLowerCase()).toContain("researcher");
    });
  });

  test.describe("Comments functionality", () => {
    test("can type a comment and it maintains focus", async () => {
      await project.goToSessions();
      await project.addSession();
      await contributors.goToContributorsTab();
      
      // Add a contributor
      await contributors.addContributor("Comment Test Person");
      
      // Type a multi-character comment character by character
      const testComment = "This is a test comment with special chars: á é ñ";
      await contributors.typeComment(0, testComment);
      
      // Verify the comment was saved correctly
      const savedComment = await contributors.getComment(0);
      expect(savedComment).toBe(testComment);
    });

    test("comment field retains focus after each keystroke", async () => {
      await project.goToSessions();
      await project.addSession();
      await contributors.goToContributorsTab();
      
      // Add a contributor
      await contributors.addContributor("Focus Test Person");
      
      // Click on the comment textarea
      const textareas = page.locator('[data-testid="contributor-comment-textarea"]');
      const textarea = textareas.nth(0);
      await textarea.click();
      
      // Type and verify focus is maintained after each character
      await page.keyboard.type("a");
      expect(await contributors.isCommentFocused(0)).toBe(true);
      
      await page.keyboard.type("b");
      expect(await contributors.isCommentFocused(0)).toBe(true);
      
      await page.keyboard.type("c");
      expect(await contributors.isCommentFocused(0)).toBe(true);
      
      // Verify the full text was typed
      const comment = await contributors.getComment(0);
      expect(comment).toBe("abc");
    });

    test("can use fill() to set comment", async () => {
      await project.goToSessions();
      await project.addSession();
      await contributors.goToContributorsTab();
      
      // Add a contributor
      await contributors.addContributor("Fill Test Person");
      
      // Use fill to set the comment
      await contributors.setComment(0, "Filled comment value");
      
      // Verify the comment
      const comment = await contributors.getComment(0);
      expect(comment).toBe("Filled comment value");
    });
  });

  test.describe("Delete contributor", () => {
    test("can delete a contributor", async () => {
      await project.goToSessions();
      await project.addSession();
      await contributors.goToContributorsTab();
      
      // Add two contributors
      await contributors.addContributor("Delete Test Person 1");
      await contributors.addContributor("Delete Test Person 2");
      
      // Verify we have 2 contributors
      const initialCount = await contributors.getContributorCount();
      expect(initialCount).toBe(2);
      
      // Delete the first contributor
      await contributors.deleteContributor(0);
      
      // Verify we now have 1 contributor
      const afterDeleteCount = await contributors.getContributorCount();
      expect(afterDeleteCount).toBe(1);
      
      // Verify the remaining contributor is the second one
      const remainingName = await contributors.getContributorName(0);
      expect(remainingName).toContain("Delete Test Person 2");
    });

    test("blank row does not have delete button", async () => {
      await project.goToSessions();
      await project.addSession();
      await contributors.goToContributorsTab();
      
      // Add one contributor
      await contributors.addContributor("Has Delete Button");
      
      // The filled row should have a delete button
      expect(await contributors.hasDeleteButton(0)).toBe(true);
      
      // The blank row (last row) should not have a delete button visible
      // Count delete buttons - should be 1 (only for the filled row)
      const deleteButtons = page.locator(".deleteButton");
      const deleteCount = await deleteButtons.count();
      expect(deleteCount).toBe(1);
    });
  });

  test.describe("Multiple contributors", () => {
    test("can add multiple contributors with different roles", async () => {
      await project.goToSessions();
      await project.addSession();
      await contributors.goToContributorsTab();
      
      // Add first contributor as Speaker
      await contributors.addContributor("Multi Test Speaker");
      await contributors.setRole(0, "Speaker");
      await contributors.setComment(0, "Primary speaker for this session");
      
      // Add second contributor as Translator
      await contributors.addContributor("Multi Test Translator");
      await contributors.setRole(1, "Translator");
      await contributors.setComment(1, "Translated to English");
      
      // Add third contributor as Researcher
      await contributors.addContributor("Multi Test Researcher");
      await contributors.setRole(2, "Researcher");
      await contributors.setComment(2, "Led the research project");
      
      // Verify all three contributors exist
      expect(await contributors.getContributorCount()).toBe(3);
      
      // Verify names
      expect(await contributors.getContributorName(0)).toContain("Multi Test Speaker");
      expect(await contributors.getContributorName(1)).toContain("Multi Test Translator");
      expect(await contributors.getContributorName(2)).toContain("Multi Test Researcher");
      
      // Verify roles
      expect((await contributors.getContributorRole(0)).toLowerCase()).toContain("speaker");
      expect((await contributors.getContributorRole(1)).toLowerCase()).toContain("translator");
      expect((await contributors.getContributorRole(2)).toLowerCase()).toContain("researcher");
      
      // Verify comments
      expect(await contributors.getComment(0)).toBe("Primary speaker for this session");
      expect(await contributors.getComment(1)).toBe("Translated to English");
      expect(await contributors.getComment(2)).toBe("Led the research project");
    });
  });

  test.describe("Contributor persistence", () => {
    test("contributors persist after switching tabs and back", async () => {
      await project.goToSessions();
      await project.addSession();
      await contributors.goToContributorsTab();
      
      // Add a contributor with role and comment
      await contributors.addContributor("Persist Test Person");
      await contributors.setRole(0, "Speaker");
      await contributors.setComment(0, "Persistence test comment");
      
      // Switch to Notes tab
      await project.goToNotesOfThisSession();
      
      // Switch back to Contributors tab
      await contributors.goToContributorsTab();
      
      // Verify the contributor data persisted
      expect(await contributors.getContributorName(0)).toContain("Persist Test Person");
      expect((await contributors.getContributorRole(0)).toLowerCase()).toContain("speaker");
      expect(await contributors.getComment(0)).toBe("Persistence test comment");
    });

    test("contributors persist after soft reload", async () => {
      await project.goToSessions();
      
      await project.addSession();
      await contributors.goToContributorsTab();
      
      // Add a contributor with role and comment using a unique name
      const uniqueName = `ReloadPerson_${Date.now()}`;
      await contributors.addContributor(uniqueName);
      await contributors.setRole(0, "Researcher");
      await contributors.setComment(0, "Reload test comment");
      
      // Wait for the session to be saved
      await page.waitForTimeout(500);
      
      // Soft reload the app
      await lameta.softReload();
      
      // Navigate back to sessions
      await project.goToSessions();
      
      // Wait for sessions to load
      await page.waitForTimeout(500);
      
      // Find and click on any session that contains our unique contributor name
      // We search for a session that when selected, shows our contributor
      const sessionRows = page.locator(".folderList .rt-tbody .rt-tr");
      const sessionCount = await sessionRows.count();
      
      let foundSession = false;
      // Search from the end (newest sessions are often at the end initially)
      for (let i = sessionCount - 1; i >= 0 && !foundSession; i--) {
        await sessionRows.nth(i).click();
        await page.waitForTimeout(200);
        await contributors.goToContributorsTab();
        
        // Check if this session has our contributor
        try {
          const contributorName = await contributors.getContributorName(0);
          if (contributorName.includes(uniqueName)) {
            foundSession = true;
            // Verify the full contributor data
            expect((await contributors.getContributorRole(0)).toLowerCase()).toContain("researcher");
            expect(await contributors.getComment(0)).toBe("Reload test comment");
          }
        } catch {
          // This session might not have contributors, continue
        }
        
        if (!foundSession) {
          await project.goToSessions();
        }
      }
      
      expect(foundSession).toBe(true);
    });
  });

  test.describe("Special characters in comments", () => {
    test("handles Unicode characters in comments", async () => {
      await project.goToSessions();
      await project.addSession();
      await contributors.goToContributorsTab();
      
      // Add a contributor
      await contributors.addContributor("Unicode Test Person");
      
      // Set a comment with various Unicode characters
      const unicodeComment = "Unicode: 中文 العربية עברית ελληνικά кириллица 日本語 한국어 🎉";
      await contributors.setComment(0, unicodeComment);
      
      // Verify the comment
      expect(await contributors.getComment(0)).toBe(unicodeComment);
    });

    test("handles special filename-like characters in comments", async () => {
      await project.goToSessions();
      await project.addSession();
      await contributors.goToContributorsTab();
      
      // Add a contributor
      await contributors.addContributor("Special Chars Person");
      
      // Set a comment with characters that might cause issues in filenames/URLs
      const specialComment = "Path: /folder/subfolder & file.txt; query=value&other=123";
      await contributors.setComment(0, specialComment);
      
      // Verify the comment
      expect(await contributors.getComment(0)).toBe(specialComment);
    });
  });

  test.describe("Edge cases", () => {
    test("contributor name with spaces and special characters", async () => {
      await project.goToSessions();
      await project.addSession();
      await contributors.goToContributorsTab();
      
      // Add a contributor with spaces and special characters
      await contributors.addContributor("Dr. José María O'Brien-Smith");
      
      // Verify the name is displayed correctly
      const name = await contributors.getContributorName(0);
      expect(name).toContain("Dr. José María O'Brien-Smith");
    });

    test("empty comment field is handled correctly", async () => {
      await project.goToSessions();
      await project.addSession();
      await contributors.goToContributorsTab();
      
      // Add a contributor
      await contributors.addContributor("Empty Comment Person");
      
      // Verify comment is empty by default
      expect(await contributors.getComment(0)).toBe("");
      
      // Set a comment then clear it
      await contributors.setComment(0, "Temporary comment");
      expect(await contributors.getComment(0)).toBe("Temporary comment");
      
      // Clear the comment
      await contributors.setComment(0, "");
      expect(await contributors.getComment(0)).toBe("");
    });
  });
});
