import { NavigationTarget } from "../navigation/NavigationTarget";

// ImdiGenerator puts a comment like this immediately before each element that it
// writes from lameta data, saying which folder, file and field the element came from:
//   <!--lameta-source {"folderType":"session","folderId":"ETR009","fieldKey":"genre"}-->
//   <Genre ...>Narrative</Genre>
// The JSON is a NavigationTarget, so a problem found in the IMDI can be taken back to
// the place in lameta where the user can fix it.
//
// Where the user enters the translations of an element's value somewhere other than
// where the value came from, as for a genre or a role, a second comment says where:
//   <!--lameta-translations {"folderType":"project","vocabularyTranslation":{...}}-->

export const kLametaSourcePrefix = "lameta-source ";
export const kLametaTranslationsPrefix = "lameta-translations ";

// XML does not allow "--" inside a comment, and an id or name may contain it, so
// every "-" in the JSON is written as its JSON escape (backslash, "u002d").
export function makeLametaSourceComment(target: NavigationTarget): string {
  return kLametaSourcePrefix + escapedJson(target);
}
export function makeLametaTranslationsComment(target: NavigationTarget): string {
  return kLametaTranslationsPrefix + escapedJson(target);
}
function escapedJson(target: NavigationTarget): string {
  return JSON.stringify(target).replace(/-/g, "\\u002d");
}

// Reads lameta-source and lameta-translations comments back
export function makeLametaSourceReader() {
  const sourcePrefix = "lameta-source";
  const translationsPrefix = "lameta-translations";
  const elementNode = 1;
  const attributeNode = 2;
  const commentNode = 8;

  function parseComment(commentText: string, prefix: string): NavigationTarget | undefined {
    const text = commentText.trim();
    if (!text.startsWith(prefix + " ")) return undefined;
    try {
      return JSON.parse(text.substring(prefix.length));
    } catch {
      return undefined;
    }
  }

  // Returns undefined if this is not a lameta-source comment.
  function parseLametaSourceComment(commentText: string): NavigationTarget | undefined {
    return parseComment(commentText, sourcePrefix);
  }

  // the element that a node is, belongs to, or is the text of
  function elementOf(node: Node): Node | null {
    return node.nodeType === attributeNode
      ? (node as Attr).ownerElement
      : node.nodeType === elementNode
        ? node
        : node.parentNode;
  }

  // Finds where in lameta a node of generated IMDI came from:
  //  - for an element, the lameta-source comment before it
  //  - for an attribute, the comment before the element that owns it
  //  - for text, the comment before the element that contains it
  // If the element has no lameta-source comment of its own (e.g. it is a fixed value
  // like <Anonymized>), this returns the source of the nearest enclosing element that
  // has one, such as the session or actor that contains it.
  function findLametaSource(node: Node): NavigationTarget | undefined {
    for (let e = elementOf(node); e && e.nodeType === elementNode; e = e.parentNode) {
      const target = commentBefore(e, sourcePrefix);
      if (target) return target;
    }
    return undefined;
  }

  // Finds where in lameta the user enters a translation that a node of generated IMDI
  // lacks: what the lameta-translations comment says, or, for an element without
  // one, what findLametaSource() says.
  function findWhereToTranslate(node: Node): NavigationTarget | undefined {
    for (let e = elementOf(node); e && e.nodeType === elementNode; e = e.parentNode) {
      const target = commentBefore(e, translationsPrefix) ?? commentBefore(e, sourcePrefix);
      if (target) return target;
    }
    return undefined;
  }

  function commentBefore(element: Node, prefix: string): NavigationTarget | undefined {
    // Skip whitespace and the generator's other comments; stop at the previous element.
    for (let n = element.previousSibling; n; n = n.previousSibling) {
      if (n.nodeType === elementNode) return undefined;
      if (n.nodeType === commentNode) {
        const target = parseComment(n.nodeValue || "", prefix);
        if (target) return target;
      }
    }
    return undefined;
  }

  return { parseLametaSourceComment, findLametaSource, findWhereToTranslate };
}

export const { parseLametaSourceComment, findLametaSource, findWhereToTranslate } =
  makeLametaSourceReader();
