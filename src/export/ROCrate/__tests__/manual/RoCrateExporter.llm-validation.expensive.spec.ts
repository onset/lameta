import { describe, it, beforeAll, expect } from "vitest";
import { getRoCrate } from "../../RoCrateExporter";
import { Project } from "../../../../model/Project/Project";
import path from "path";
import fs from "fs-extra";
import axios from "axios";

/*
  This test can be helpful, but in areas where the spec isn't clear, it can actually ping-pong
  between opinions on what is correct.  Here are some cases where I have judge it incorrect:

  1) language references
  INCORRECT: "The `inLanguage` property value is an object reference, but the LDAC Profile requires it to be a string.".
  This view is not clear from the spec, and the example from paradisec does not do that. It uses a full @type: language object:
  {"@id":"#language_erk","@type":"Language","code":"erk","location":{"@id":"#geo_168.159,-17.83,168.594,-17.585"},"name":"Efate, South"},

*/

// This test is expensive and only runs when explicitly enabled by a human.
describe.skipIf("Manual test: Will incur charges")(
  "RoCrateExporter OpenRouter Validation (Expensive)",
  () => {
    let project: Project;
    const doondoProjectPath =
      "c:\\dev\\lameta projects\\SayMore Data from Brian Parker\\Doondo";

    beforeAll(() => {
      // Check for required environment variables
      if (!process.env.OPENROUTER_KEY) {
        throw new Error(
          "OPENROUTER_KEY environment variable is required for this test"
        );
      }

      // Check if the Doondo project exists
      const projectFile = path.join(doondoProjectPath, "Doondo.sprj");
      if (!fs.existsSync(projectFile)) {
        throw new Error(`Doondo project not found at ${projectFile}`);
      }

      // Load the real Doondo project
      project = Project.fromDirectory(doondoProjectPath);

      if (project.loadingError) {
        throw new Error(
          `Failed to load Doondo project: ${project.loadingError}`
        );
      }
    });

    it("should validate RO-Crate export against LDAC profile using Gemini 2.5 Pro", async () => {
      console.log(`Loading project from: ${doondoProjectPath}`);
      console.log(`Project has ${project.sessions.items.length} sessions`);

      // Generate RO-Crate metadata for the entire project
      const roCrateData = await getRoCrate(project, project);

      // Ensure we have a JSON string for the API call
      const roCrateJson =
        typeof roCrateData === "string"
          ? roCrateData
          : JSON.stringify(roCrateData, null, 2);

      console.log(`Generated RO-Crate JSON size: ${roCrateJson.length} chars`);

      const prompt = `The attached file should conform to https://raw.githubusercontent.com/Language-Research-Technology/ldac-profile/refs/heads/master/profile/profile.md and https://www.researchobject.org/ro-crate/specification/1.2/structure.
Please check for any significant problems, list them as numbered markdown checkmark items. If you find no significant problems, return only this text: [OK]. Else, explain each problem along with an example from the json.

* Do not report that inLanguage property should be a string. We want it to be an object reference with a matching object.
* Do not report that age should be a number. It should be a string.
* Do not complain about the roles of contributors. Those are user decisions; our job is just to be compliant with the spec.`;

      const model = "google/gemini-2.5-pro";
      try {
        const response = await axios.post(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            model,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: prompt
                  },
                  {
                    type: "text",
                    text: `\n\nRO-Crate JSON:\n${roCrateJson}`
                  }
                ]
              }
            ],
            max_tokens: 20000,
            temperature: 0.1
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.OPENROUTER_KEY}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://github.com/onset/lameta",
              "X-Title": "lameta RO-Crate Validation"
            },
            timeout: 120000 // 2 minutes timeout
          }
        );

        const result = response.data.choices[0].message.content.trim();
        console.log(`OpenRouter response: ${result}`);

        // Save the response to a file for reference

        const now = new Date();

        const pad = (n: number) => n.toString().padStart(2, "0");

        const datePart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
          now.getDate()
        )}`;
        const timePart = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(
          now.getSeconds()
        )}`;

        const reviewFilePath = path.join(
          process.cwd(),
          `rocrate-export-review-doondo-${datePart}_${timePart}.md`
        );
        const reviewContent = `# RO-Crate Export Review - Doondo Project

Generated: ${new Date().toISOString()}
Model: ${model}
Project: ${doondoProjectPath}
Sessions: ${project.sessions.items.length}
RO-Crate Size: ${roCrateJson.length} characters

## Validation Results

${result}
`;

        await fs.writeFile(reviewFilePath, reviewContent, "utf8");
        console.log(`✅ Review saved to: ${reviewFilePath}`);

        // If the result is exactly "[OK]", the validation passed
        if (result === "[OK]") {
          console.log("✅ RO-Crate validation passed!");
          expect(result).toBe("[OK]");
        } else {
          // If not, log the problems and fail the test
          console.error("❌ RO-Crate validation failed:");
          console.error(result);

          // Fail the test with the validation errors
          expect.fail(
            `RO-Crate validation failed. OpenRouter response:\n${result}`
          );
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error(
            "API Error:",
            error.response?.status,
            error.response?.data
          );
          throw new Error(
            `OpenRouter API error: ${error.response?.status} - ${
              error.response?.data?.error?.message || error.message
            }`
          );
        }
        throw error;
      }
    }, 180000); // 3 minutes timeout for the test
  }
);
