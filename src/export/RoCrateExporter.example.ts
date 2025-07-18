/**
 * Example usage of RoCrateExporter 
 * This file demonstrates how to use the RoCrateExporter and shows expected output
 */

import { RoCrateExporter } from './RoCrateExporter';

// Create a sample project structure for demonstration
const sampleProject = {
  properties: {
    getValue: (key: string) => {
      if (key === 'title') {
        return { text: 'Endangered Language Documentation Project' };
      }
      return null;
    }
  },
  sessions: {
    items: [
      {
        id: 'session-1',
        properties: {
          getValue: (key: string) => {
            switch (key) {
              case 'title':
                return { text: 'Fishing Stories' };
              case 'genre':
                return { text: 'narrative' }; // Maps to ldac:Narrative
              case 'description':
                return { text: 'Traditional stories about fishing techniques passed down through generations' };
              case 'date':
                return { asISODateString: () => '2023-01-15' };
              default:
                return null;
            }
          }
        }
      },
      {
        id: 'session-2', 
        properties: {
          getValue: (key: string) => {
            switch (key) {
              case 'title':
                return { text: 'Elder Interview' };
              case 'genre':
                return { text: 'interview' }; // Maps to ldac:Interview
              case 'description':
                return { text: 'Interview with community elder about traditional practices' };
              case 'date':
                return { asISODateString: () => '2023-02-10' };
              default:
                return null;
            }
          }
        }
      },
      {
        id: 'session-3',
        properties: {
          getValue: (key: string) => {
            switch (key) {
              case 'title':
                return { text: 'Ceremonial Speech' };
              case 'genre':
                return { text: 'avoidance language, formulaic discourse' }; // Mixed: custom + ldac:Formulaic
              case 'description':
                return { text: 'Ceremonial speech using traditional avoidance language' };
              default:
                return null;
            }
          }
        }
      }
    ]
  }
} as any;

/**
 * Demonstrate the RoCrateExporter usage
 */
export function demonstrateRoCrateExport() {
  const exporter = new RoCrateExporter();
  const roCrate = exporter.export(sampleProject);
  
  console.log('Generated RO-Crate JSON:');
  console.log(JSON.stringify(roCrate, null, 2));
  
  return roCrate;
}

/**
 * Example of expected output structure for verification
 */
export const expectedRoCrateStructure = {
  "@context": {
    "schema": "http://schema.org/",
    "ldac": "https://w3id.org/ldac/terms#",
    "pcdm": "http://pcdm.org/models#"
  },
  "@graph": [
    {
      "@id": "ro-crate-metadata.json",
      "@type": "CreativeWork",
      "about": { "@id": "./" },
      "conformsTo": { "@id": "https://w3id.org/ldac/profile" }
    },
    {
      "@id": "./",
      "@type": ["Dataset", "RepositoryCollection"],
      "name": "Endangered Language Documentation Project",
      "hasPart": [
        { "@id": "session-1" },
        { "@id": "session-2" },
        { "@id": "session-3" }
      ],
      "conformsTo": { "@id": "https://w3id.org/ldac/profile#Collection" }
    },
    {
      "@id": "session-1",
      "@type": ["RepositoryObject", "CreativeWork"],
      "name": "Fishing Stories",
      "description": "Traditional stories about fishing techniques passed down through generations",
      "dateCreated": "2023-01-15",
      "ldac:linguisticGenre": [
        { "@id": "ldac:Narrative" }
      ]
    },
    {
      "@id": "session-2",
      "@type": ["RepositoryObject", "CreativeWork"],
      "name": "Elder Interview",
      "description": "Interview with community elder about traditional practices",
      "dateCreated": "2023-02-10",
      "ldac:linguisticGenre": [
        { "@id": "ldac:Interview" }
      ]
    },
    {
      "@id": "session-3",
      "@type": ["RepositoryObject", "CreativeWork"],
      "name": "Ceremonial Speech",
      "description": "Ceremonial speech using traditional avoidance language",
      "ldac:linguisticGenre": [
        { "@id": "#AvoidanceLanguage" },
        { "@id": "ldac:Formulaic" }
      ]
    },
    // Genre term definitions would follow...
  ]
};

// Run demonstration if this file is executed directly
if (typeof process !== 'undefined' && require && require.main === module) {
  demonstrateRoCrateExport();
}