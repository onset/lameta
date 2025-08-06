import { describe, it, beforeAll, expect } from "vitest";
import { getRoCrate } from "../RoCrateExporter";
import { Project } from "../../../model/Project/Project";
import path from "path";
import fs from "fs-extra";
import axios from "axios";

// This test is expensive and only runs when explicitly enabled by a human.
describe.skipIf(!process.env.ENABLE_EXPENSIVE_TESTS)(
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
Please check for any significant problems, list them as numbered markdown checkmark items. If you find no significant problems, return only this text: [OK]. Else, explain each problem along with an example from the json.`;

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
