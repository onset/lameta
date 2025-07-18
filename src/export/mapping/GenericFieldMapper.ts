/**
 * Generic field mapping system for mapping lameta fields to external vocabularies.
 * This allows for reusable mapping logic across different export formats.
 */

export interface FieldMapping {
  lametaId: string;
  externalId: string;
  externalLabel: string;
  externalDescription?: string;
  externalDefinedTermSet?: string;
}

export interface MappingConfiguration {
  defaultTermSet: string;
  customTermSet: string;
  mappings: FieldMapping[];
}

export interface MappedField {
  id: string;
  type: "DefinedTerm";
  name: string;
  description?: string;
  inDefinedTermSet: { "@id": string };
}

export interface MappingResult {
  mappedFields: MappedField[];
  termSets: { [key: string]: DefinedTermSet };
}

export interface DefinedTermSet {
  id: string;
  type: "DefinedTermSet";
  name: string;
}

export class GenericFieldMapper {
  private config: MappingConfiguration;

  constructor(config: MappingConfiguration) {
    this.config = config;
  }

  /**
   * Maps a list of lameta field values to their external vocabulary equivalents
   * @param lametaValues Array of lameta field values (e.g., genre names)
   * @returns Mapping result with mapped fields and required term sets
   */
  mapFields(lametaValues: string[]): MappingResult {
    const mappedFields: MappedField[] = [];
    const termSets: { [key: string]: DefinedTermSet } = {};
    const usedTermSets = new Set<string>();

    // Process each lameta value
    for (const value of lametaValues) {
      const mapping = this.findMapping(value);
      
      if (mapping) {
        // Found a mapping to external vocabulary
        const termSetId = mapping.externalDefinedTermSet || this.config.defaultTermSet;
        
        mappedFields.push({
          id: mapping.externalId,
          type: "DefinedTerm",
          name: mapping.externalLabel,
          description: mapping.externalDescription,
          inDefinedTermSet: { "@id": termSetId }
        });
        
        usedTermSets.add(termSetId);
      } else {
        // No mapping found, create custom term
        const customTermId = `#${this.sanitizeId(value)}`;
        
        mappedFields.push({
          id: customTermId,
          type: "DefinedTerm",
          name: value,
          inDefinedTermSet: { "@id": this.config.customTermSet }
        });
        
        usedTermSets.add(this.config.customTermSet);
      }
    }

    // Create term sets for all used term sets
    for (const termSetId of usedTermSets) {
      termSets[termSetId] = this.createTermSet(termSetId);
    }

    return {
      mappedFields,
      termSets
    };
  }

  private findMapping(lametaValue: string): FieldMapping | undefined {
    return this.config.mappings.find(mapping => 
      mapping.lametaId.toLowerCase() === lametaValue.toLowerCase()
    );
  }

  private sanitizeId(value: string): string {
    // Convert to PascalCase and remove non-alphanumeric characters
    return value
      .replace(/[^a-zA-Z0-9\s_-]/g, '') // Remove special chars except spaces, underscores, and hyphens
      .split(/[\s_-]+/) // Split on whitespace, underscores, and hyphens
      .filter(word => word.length > 0) // Remove empty strings
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  private createTermSet(termSetId: string): DefinedTermSet {
    if (termSetId === this.config.defaultTermSet) {
      return {
        id: termSetId,
        type: "DefinedTermSet",
        name: "Linguistic Genre Terms"
      };
    } else if (termSetId === this.config.customTermSet) {
      return {
        id: termSetId,
        type: "DefinedTermSet", 
        name: "Custom Project Genres"
      };
    } else {
      return {
        id: termSetId,
        type: "DefinedTermSet",
        name: "Defined Terms"
      };
    }
  }
}