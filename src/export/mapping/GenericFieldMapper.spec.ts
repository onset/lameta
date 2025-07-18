/**
 * Unit tests for GenericFieldMapper
 */

import { describe, it, expect } from 'vitest';
import { GenericFieldMapper, MappingConfiguration } from './GenericFieldMapper';

describe('GenericFieldMapper', () => {
  const testConfig: MappingConfiguration = {
    defaultTermSet: "test:DefaultTerms",
    customTermSet: "#CustomTerms", 
    mappings: [
      {
        lametaId: "dialog",
        externalId: "test:Dialogue",
        externalLabel: "Dialogue",
        externalDescription: "A conversation between participants"
      },
      {
        lametaId: "narrative", 
        externalId: "test:Narrative",
        externalLabel: "Narrative",
        externalDescription: "A story or account"
      }
    ]
  };

  it('should map known lameta values to external vocabulary', () => {
    const mapper = new GenericFieldMapper(testConfig);
    const result = mapper.mapFields(['dialog', 'narrative']);

    expect(result.mappedFields).toHaveLength(2);
    
    const dialogField = result.mappedFields.find(f => f.id === 'test:Dialogue');
    expect(dialogField).toBeDefined();
    expect(dialogField?.name).toBe('Dialogue');
    expect(dialogField?.description).toBe('A conversation between participants');
    expect(dialogField?.inDefinedTermSet['@id']).toBe('test:DefaultTerms');

    const narrativeField = result.mappedFields.find(f => f.id === 'test:Narrative');
    expect(narrativeField).toBeDefined();
    expect(narrativeField?.name).toBe('Narrative');
    expect(narrativeField?.description).toBe('A story or account');
  });

  it('should create custom terms for unmapped values', () => {
    const mapper = new GenericFieldMapper(testConfig);
    const result = mapper.mapFields(['unknown_genre']);

    expect(result.mappedFields).toHaveLength(1);
    
    const customField = result.mappedFields[0];
    expect(customField.id).toBe('#UnknownGenre');
    expect(customField.name).toBe('unknown_genre');
    expect(customField.inDefinedTermSet['@id']).toBe('#CustomTerms');
  });

  it('should handle mixed mapped and unmapped values', () => {
    const mapper = new GenericFieldMapper(testConfig);
    const result = mapper.mapFields(['dialog', 'custom_genre', 'narrative']);

    expect(result.mappedFields).toHaveLength(3);
    
    // Mapped values
    expect(result.mappedFields.some(f => f.id === 'test:Dialogue')).toBe(true);
    expect(result.mappedFields.some(f => f.id === 'test:Narrative')).toBe(true);
    
    // Custom value
    expect(result.mappedFields.some(f => f.id === '#CustomGenre')).toBe(true);
  });

  it('should be case insensitive for mapping', () => {
    const mapper = new GenericFieldMapper(testConfig);
    const result = mapper.mapFields(['DIALOG', 'Narrative']);

    expect(result.mappedFields).toHaveLength(2);
    expect(result.mappedFields.some(f => f.id === 'test:Dialogue')).toBe(true);
    expect(result.mappedFields.some(f => f.id === 'test:Narrative')).toBe(true);
  });

  it('should create appropriate term sets', () => {
    const mapper = new GenericFieldMapper(testConfig);
    const result = mapper.mapFields(['dialog', 'custom_genre']);

    expect(Object.keys(result.termSets)).toHaveLength(2);
    
    const defaultTermSet = result.termSets['test:DefaultTerms'];
    expect(defaultTermSet).toBeDefined();
    expect(defaultTermSet.name).toBe('Linguistic Genre Terms');

    const customTermSet = result.termSets['#CustomTerms'];
    expect(customTermSet).toBeDefined();
    expect(customTermSet.name).toBe('Custom Project Genres');
  });

  it('should sanitize IDs for custom terms', () => {
    const mapper = new GenericFieldMapper(testConfig);
    const result = mapper.mapFields(['avoidance language', 'test-genre!', 'some weird name']);

    expect(result.mappedFields).toHaveLength(3);
    
    const sanitizedIds = result.mappedFields.map(f => f.id);
    expect(sanitizedIds).toContain('#AvoidanceLanguage');
    expect(sanitizedIds).toContain('#TestGenre');
    expect(sanitizedIds).toContain('#SomeWeirdName');
  });

  it('should handle empty input', () => {
    const mapper = new GenericFieldMapper(testConfig);
    const result = mapper.mapFields([]);

    expect(result.mappedFields).toHaveLength(0);
    expect(Object.keys(result.termSets)).toHaveLength(0);
  });

  it('should handle duplicate values', () => {
    const mapper = new GenericFieldMapper(testConfig);
    const result = mapper.mapFields(['dialog', 'dialog', 'narrative']);

    // Should still process all values, even duplicates
    expect(result.mappedFields).toHaveLength(3);
    expect(result.mappedFields.filter(f => f.id === 'test:Dialogue')).toHaveLength(2);
  });
});