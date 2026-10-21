import { NavigationTarget } from "../navigation/NavigationTarget";

// ImdiGenerator puts a comment like this immediately before each element that it
// writes from lameta data, saying which folder, file and field the element came from:
//   <!--lameta-source {"folderType":"session","folderId":"ETR009","fieldKey":"genre"}-->
//   <Genre ...>Narrative</Genre>
// The JSON is a NavigationTarget, so a problem found in the IMDI can be taken back to
// the place in lameta where the user can fix it.

export const kLametaSourcePrefix = "lameta-source ";

// XML does not allow "--" inside a comment, and an id or name may contain it, so
// every "-" in the JSON is written as its JSON escape (backslash, "u002d").
export function makeLametaSourceComment(target: NavigationTarget): string {
  return kLametaSourcePrefix + JSON.stringify(target).replace(/-/g, "\\u002d");
}

// Reads lameta-source comments back. This function must not refer to anything
// outside its own body, because the rules sandbox gets its source text
// (see rulesSandboxScript.ts).
export function makeLametaSourceReader() {
  const prefix = "lameta-source";
  const elementNode = 1;
  const attributeNode = 2;
  const commentNode = 8;

  // Returns undefined if this is not a lameta-source comment.
  function parseLametaSourceComment(commentText: string): NavigationTarget | undefined {
    const text = commentText.trim();
    if (!text.startsWith(prefix)) return undefined;
    try {
      return JSON.parse(text.substring(prefix.length));
    } catch {
      return undefined;
    }
  }

  // Finds where in lameta a node of generated IMDI came from:
  //  - for an element, the lameta-source comment before it
  //  - for an attribute, the comment before the element that owns it
  //  - for text, the comment before the element that contains it
  // If the element has no lameta-source comment of its own (e.g. it is a fixed value
  // like <Anonymized>), this returns the source of the nearest enclosing element that
  // has one, such as the session or actor that contains it.
  function findLametaSource(node: Node): NavigationTarget | undefined {
    let element: Node | null =
      node.nodeType === attributeNode
        ? (node as Attr).ownerElement
        : node.nodeType === elementNode
          ? node
          : node.parentNode;
    while (element && element.nodeType === elementNode) {
      const target = sourceCommentBefore(element);
      if (target) return target;
      element = element.parentNode;
    }
    return undefined;
  }

  function sourceCommentBefore(element: Node): NavigationTarget | undefined {
    // Skip whitespace and the generator's other comments; stop at the previous element.
    for (let n = element.previousSibling; n; n = n.previousSibling) {
      if (n.nodeType === elementNode) return undefined;
      if (n.nodeType === commentNode) {
        const target = parseLametaSourceComment(n.nodeValue || "");
        if (target) return target;
      }
    }
    return undefined;
  }

  return { parseLametaSourceComment, findLametaSource };
}

export const { parseLametaSourceComment, findLametaSource } = makeLametaSourceReader();
