/**
 * RO-Crate Exporter for lameta projects
 * 
 * Exports lameta projects to RO-Crate format following the LDAC profile:
 * https://w3id.org/ldac/profile
 */

import { Project } from "../model/Project/Project";
import { Session } from "../model/Project/Session/Session";
import { GenericFieldMapper } from "./mapping/GenericFieldMapper";
import { ldacGenreMappingConfiguration } from "./mapping/LdacGenreMapping";

export interface RoCrateContext {
  schema: string;
  ldac: string;
  pcdm: string;
}

export interface RoCrateEntity {
  "@id": string;
  "@type": string | string[];
  [key: string]: any;
}

export interface RoCrateDocument {
  "@context": RoCrateContext;
  "@graph": RoCrateEntity[];
}

export class RoCrateExporter {
  private genreMapper: GenericFieldMapper;

  constructor() {
    this.genreMapper = new GenericFieldMapper(ldacGenreMappingConfiguration);
  }

  /**
   * Export a lameta project to RO-Crate format
   * @param project The lameta project to export
   * @returns RO-Crate JSON document
   */
  export(project: Project): RoCrateDocument {
    const entities: RoCrateEntity[] = [];
    
    // Add metadata descriptor
    entities.push(this.createMetadataDescriptor());
    
    // Add root dataset
    entities.push(this.createRootDataset(project));
    
    // Add sessions
    const sessionEntities = this.createSessionEntities(project);
    entities.push(...sessionEntities.entities);
    
    // Add all genre term definitions
    entities.push(...sessionEntities.genreTerms);
    
    return {
      "@context": {
        schema: "http://schema.org/",
        ldac: "https://w3id.org/ldac/terms#", 
        pcdm: "http://pcdm.org/models#"
      },
      "@graph": entities
    };
  }

  private createMetadataDescriptor(): RoCrateEntity {
    return {
      "@id": "ro-crate-metadata.json",
      "@type": "CreativeWork",
      about: { "@id": "./" },
      conformsTo: { "@id": "https://w3id.org/ldac/profile" }
    };
  }

  private createRootDataset(project: Project): RoCrateEntity {
    const sessionRefs = project.sessions.items.map((session: Session) => ({ "@id": session.id }));
    
    return {
      "@id": "./",
      "@type": ["Dataset", "RepositoryCollection"],
      name: project.properties.getValue("title")?.text || "Untitled Project",
      hasPart: sessionRefs,
      conformsTo: { "@id": "https://w3id.org/ldac/profile#Collection" }
    };
  }

  private createSessionEntities(project: Project): { entities: RoCrateEntity[], genreTerms: RoCrateEntity[] } {
    const entities: RoCrateEntity[] = [];
    const allGenreTerms = new Map<string, RoCrateEntity>();
    const allTermSets = new Map<string, RoCrateEntity>();

    // Process each session
    for (const folder of project.sessions.items) {
      const session = folder as Session;
      const sessionEntity = this.createSessionEntity(session);
      entities.push(sessionEntity);

      // Process genres for this session
      const genreField = session.properties.getValue("genre");
      if (genreField && genreField.text) {
        const genres = this.parseGenres(genreField.text);
        const mappingResult = this.genreMapper.mapFields(genres);

        // Add genre references to session
        if (mappingResult.mappedFields.length > 0) {
          sessionEntity["ldac:linguisticGenre"] = mappingResult.mappedFields.map(field => ({ "@id": field.id }));
        }

        // Collect genre terms and term sets
        for (const field of mappingResult.mappedFields) {
          allGenreTerms.set(field.id, {
            "@id": field.id,
            "@type": field.type,
            name: field.name,
            ...(field.description && { description: field.description }),
            inDefinedTermSet: field.inDefinedTermSet
          });
        }

        for (const [termSetId, termSet] of Object.entries(mappingResult.termSets)) {
          allTermSets.set(termSetId, {
            "@id": termSet.id,
            "@type": termSet.type,
            name: termSet.name
          });
        }
      }
    }

    // Convert maps to arrays for output
    const genreTerms = [...allGenreTerms.values(), ...allTermSets.values()];

    return { entities, genreTerms };
  }

  private createSessionEntity(session: Session): RoCrateEntity {
    const entity: RoCrateEntity = {
      "@id": session.id,
      "@type": ["RepositoryObject", "CreativeWork"],
      name: session.properties.getValue("title")?.text || session.id
    };

    // Add other session properties as needed
    const description = session.properties.getValue("description")?.text;
    if (description) {
      entity.description = description;
    }

    const date = session.properties.getValue("date")?.asISODateString();
    if (date) {
      entity.dateCreated = date;
    }

    return entity;
  }

  private parseGenres(genreText: string): string[] {
    // Handle comma-separated genres or single genre
    return genreText
      .split(/,|;/)
      .map(genre => genre.trim())
      .filter(genre => genre.length > 0);
  }
}