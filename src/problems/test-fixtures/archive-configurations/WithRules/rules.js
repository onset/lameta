// A rules file with one trivial check, for unit tests
export const interfaceVersion = 1;
export const format = "imdi";

export function checkSession(doc, report) {
  for (const name of doc.querySelectorAll("Session > Name")) {
    if (name.textContent.trim() === "")
      report({
        id: "sessionName",
        message: "Session name is empty",
        node: name,
      });
  }
}
