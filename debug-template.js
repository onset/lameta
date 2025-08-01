// Simple debug script to understand what's happening with template processing
const mockField = {
  key: "testLanguages",
  persist: true,
  type: "languageChoices",
  rocrate: {
    key: "ldac:subjectLanguage",
    array: true,
    template: {
      "@id": "#language_[v]",
      "@type": "Language",
      name: "[languageName]"
    }
  }
};

const template = mockField.rocrate.template;
console.log("Template:", template);
console.log("Template @id:", template["@id"]);
console.log("Includes #language_:", template["@id"].includes("#language_"));
console.log("Field type:", mockField.type);

// Check the detection logic
const isLanguageTemplate =
  mockField.type === "languageChoices" &&
  template["@id"] &&
  template["@id"].includes("#language_");

console.log("Is language template:", isLanguageTemplate);
