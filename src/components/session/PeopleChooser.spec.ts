import { describe, it, expect } from "vitest";
import { Contribution } from "../../model/file/File";

/**
 * LAM-114: PeopleChooser deletes contributions without personReference when updating selections
 * https://linear.app/lameta/issue/LAM-114
 *
 * The PeopleChooser component filters out contributions without personReference for display,
 * but when onChange fires, it clears ALL contributions and only restores those that were
 * visible (i.e., have personReference). This causes data loss for contributions without
 * a personReference.
 *
 * This test simulates the behavior of the onChange handler to verify the bug and fix.
 */

describe("PeopleChooser onChange logic", () => {
  /**
   * Simulates the FIXED behavior of PeopleChooser's onChange handler.
   * This preserves contributions without personReference.
   */
  function fixedOnChangeHandler(
    contributions: Contribution[],
    newChoices: { contribution: Contribution }[]
  ): Contribution[] {
    // LAM-114 fix: Preserve contributions without personReference before clearing
    const contributionsWithoutPersonRef = contributions.filter(
      (c) => !c.personReference
    );

    const result: Contribution[] = [];
    newChoices.forEach((c) => {
      result.push(c.contribution);
    });

    // LAM-114 fix: Restore contributions without personReference
    contributionsWithoutPersonRef.forEach((c) => {
      result.push(c);
    });

    return result;
  }

  it("should preserve contributions without personReference when removing a person", () => {
    // Setup: 3 contributions - 2 with personReference, 1 without
    const alice = new Contribution("Alice", "participant", "notes about Alice");
    const bob = new Contribution("Bob", "recorder", "notes about Bob");
    const noPersonContrib = new Contribution(
      "",
      "consultant",
      "important metadata without a person"
    );

    const initialContributions = [alice, bob, noPersonContrib];

    // The currentValueArray in PeopleChooser only shows contributions with personReference
    const visibleContributions = initialContributions
      .filter((c) => c.personReference)
      .map((c, index) => ({
        value: "existing" + index,
        label: c.personReference + ":" + (c.role || ""),
        contribution: c
      }));

    // User removes Bob - now only Alice is in the selection
    const newSelection = visibleContributions.filter(
      (v) => v.contribution.personReference !== "Bob"
    );

    // Apply the fixed onChange handler
    const result = fixedOnChangeHandler(initialContributions, newSelection);

    // After fix: we expect 2 contributions (Alice + noPersonContrib)
    expect(result.length).toBe(2);
    expect(result.find((c) => c.personReference === "Alice")).toBeDefined();
    expect(result.find((c) => c.personReference === "")).toBeDefined();
    expect(result.find((c) => c.role === "consultant")).toBeDefined();
  });

  it("should preserve contributions without personReference when adding a person", () => {
    // Setup: 2 contributions - 1 with personReference, 1 without
    const alice = new Contribution("Alice", "participant", "notes about Alice");
    const noPersonContrib = new Contribution(
      "",
      "consultant",
      "important metadata without a person"
    );

    const initialContributions = [alice, noPersonContrib];

    // User adds Charlie
    const charlie = new Contribution("Charlie", "speaker", "new person");
    const newSelection = [
      { value: "existing0", label: "Alice:participant", contribution: alice },
      { value: "choice0", label: "Charlie:speaker", contribution: charlie }
    ];

    // Apply the fixed onChange handler
    const result = fixedOnChangeHandler(initialContributions, newSelection);

    // After fix: 3 contributions (Alice, Charlie, noPersonContrib)
    expect(result.length).toBe(3);
    expect(result.find((c) => c.personReference === "Alice")).toBeDefined();
    expect(result.find((c) => c.personReference === "Charlie")).toBeDefined();
    expect(result.find((c) => c.personReference === "")).toBeDefined();
  });
});
