/* haven't been able to figure out the actual API for linguijs extractor (there is none, just examples that use babel). 
I don't know the extract() function is supposed to do.

Therefore, for now, I'm just converting the json files to some JS and leave them where the linguijs extractor will find them
*/

// Read in all the json files in the configuration directory. Make an array of each "description" property, then write a JS file
// that uses linguijs macros with each of those descriptions. The linguijs extractor will find them and add them to the catalog.

import fs from "fs";
import path from "path";
import JSON5 from "json5";

type Message = { context: string; message: string };

function harvestMessagesFromFile(
  relativePath: string,
  currentMessages: Message[]
): void {
  const root = JSON5.parse(fs.readFileSync(relativePath, "utf8"));
  // for each of project, sessions, people
  for (const area of Object.keys(root)) {
    for (const field of root[area]) {
      for (const prop of Object.keys(field)) {
        if (
          [
            "englishLabel",
            "description",
            "separatorWithCommaInstructions",
            "tipOnUsingThisField"
          ].includes(prop)
        ) {
          // if currentMessages already has this message, add this context to it after a comma
          const existingMessage = currentMessages.find(
            (m) => m.message === field[prop]
          );
          const parent = path.basename(path.dirname(relativePath));
          const context = `${parent}/${area}/${field.key}/${
            prop === "englishLabel" ? "" : prop
          }`.replace(/\/$/, "");
          if (existingMessage) {
            existingMessage.context = `${existingMessage.context}, ${context}`;
          } else {
            currentMessages.push({
              context: context,
              message: field[prop]
            });
          }
        }
      }
    }
  }
}

/*
// I originally was making this for the linguijs extractor, but until we upgrade to linguijs r, there's no way to give the proper context (msgctxt)
// so now we're just making our own po files.
function extractAllToJsForLingui() {
  const messages = collectAllMessage();
  const js = messages
    .map((m) => {
      return `t(${JSON5.stringify(m)})`;
    })
    .join("\n");
  console.log(js);
  const jsFilePath = path.join(__dirname, "./extracted-messages.js");
  fs.writeFileSync(jsFilePath, `import { t } from "@lingui/macro"; \n${js}`);
}
*/
export function createAllPoFilesFromJsons() {
  const sets = ["fields" /* "vocabularies" */];
  for (const set of sets) {
    createPoFilesFromOneSetOfJsons(set);
  }
}

function createPoFilesFromOneSetOfJsons(set: string) {
  const messages = collectMessageFromOneSetOfFiles(set);
  const content = messages
    .map((m) => {
      return `msgctxt "${m.context}"\nmsgid "${m.message}"\nmsgstr ""\n`;
    })
    .join("\n");
  //console.log(content);
  const jsFilePath = path.join(/*__dirname*/ "./", `locale/en/${set}.po`);
  fs.writeFileSync(jsFilePath, content);
}

export function collectMessageFromOneSetOfFiles(set: string): Message[] {
  const messages: Message[] = [];
  const configurationDirectory = path.join(
    /*__dirname*/ "./",
    "configurations"
  );

  const findFilesRecursively = (dir: string): string[] => {
    let files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files = files.concat(findFilesRecursively(fullPath));
      } else if (entry.isFile() && entry.name === set + ".json5") {
        files.push(fullPath);
      }
    }
    return files;
  };
  const files = findFilesRecursively(configurationDirectory);
  for (const file of files) {
    harvestMessagesFromFile(file, messages);
  }
  return messages;
}

/*
import { describe, it } from "vitest";
import { fi } from "make-plural";

describe("harvestMessagesFromFile", () => {
  it("should read the fields.json file", () => {
    const messages: Message[] = [];
    const filePath = path.join(__dirname, "configurations/lameta/fields.json5");
    harvestMessagesFromFile(filePath, messages);
    console.log(JSON.stringify(messages, null, 2));
  });
});

// a simple test to see if we can read the fields.json file
describe("collectAllMessage", () => {
  it("should read the fields.json file", () => {
    collectAllMessage();
  });
});

describe("extractAllPoFile", () => {
  it("should extract all messages", () => {
    createAllPoFiles();
  });
});
*/

createAllPoFilesFromJsons(); // run from packages.json "strings:extract"
