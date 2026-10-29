import { describe, it, expect } from "vitest";
import { keepIfSame } from "./problems";

describe("keepIfSame", () => {
  const fieldA = {};
  const fieldB = {};
  const problem = (message: string, field?: object) => ({
    checkId: "required",
    message,
    target: { folderType: "session", folderId: "ETR009", fieldKey: "title" },
    field,
  });

  it("keeps the previous list when the problems are the same", () => {
    const previous = [problem("one", fieldA), problem("two")];
    expect(keepIfSame(previous, [problem("one", fieldA), problem("two")])).toBe(previous);
    expect(keepIfSame([], [])).toEqual([]);
  });

  it("takes the new list when a problem differs, is added, or moves", () => {
    const previous = [problem("one"), problem("two")];
    const changed = [problem("one"), problem("three")];
    expect(keepIfSame(previous, changed)).toBe(changed);
    const added = [problem("one"), problem("two"), problem("three")];
    expect(keepIfSame(previous, added)).toBe(added);
    const reordered = [problem("two"), problem("one")];
    expect(keepIfSame(previous, reordered)).toBe(reordered);
  });

  it("takes the new list when a problem's target differs", () => {
    const previous = [problem("one")];
    const next = [{ ...problem("one"), target: { ...problem("one").target, folderId: "ETR010" } }];
    expect(keepIfSame(previous, next)).toBe(next);
  });

  it("compares a problem's field by identity", () => {
    const previous = [problem("one", fieldA)];
    const next = [problem("one", fieldB)];
    expect(keepIfSame(previous, next)).toBe(next);
  });
});
