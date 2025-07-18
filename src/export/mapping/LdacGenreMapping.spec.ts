/**
 * Test the LDAC genre mapping configuration against the existing genres.json
 */

import { describe, it, expect } from 'vitest';
import { ldacGenreMappingConfiguration } from './LdacGenreMapping';
import { GenericFieldMapper } from './GenericFieldMapper';

// Import the existing genres from the project
// Note: This would need to be updated if genres.json structure changes
const existingGenres = [
  'drama', 'dialog', 'formulaic_discourse', 'interactive_discourse', 'elicitation',
  'language_play', 'ludic', 'oratory', 'narrative', 'procedural_discourse', 'report',
  'singing', 'translation', 'instrumental_music', 'unintelligible_speech',
  'conversation', 'interview', 'personal_narrative', 'oral_history', 'folktale',
  'verbal_art', 'mythology', 'procedural_text', 'description', 'proverb', 'song',
  'ritual', 'stimuli', 'questionnaire', 'consent', 'notes', 'photograph', 'map',
  'community_materials', 'academic_output', 'dictionary', 'grammar', 'collection_description'
];

describe('LDAC Genre Mapping Configuration', () => {
  const mapper = new GenericFieldMapper(ldacGenreMappingConfiguration);

  it('should have proper LDAC configuration structure', () => {
    expect(ldacGenreMappingConfiguration.defaultTermSet).toBe('ldac:LinguisticGenreTerms');
    expect(ldacGenreMappingConfiguration.customTermSet).toBe('#CustomGenreTerms');
    expect(ldacGenreMappingConfiguration.mappings).toBeDefined();
    expect(Array.isArray(ldacGenreMappingConfiguration.mappings)).toBe(true);
    expect(ldacGenreMappingConfiguration.mappings.length).toBeGreaterThan(0);
  });

  it('should map core conversational genres to ldac:Dialogue', () => {
    const result = mapper.mapFields(['dialog', 'conversation']);
    
    const mappedFields = result.mappedFields;
    expect(mappedFields).toHaveLength(2);
    expect(mappedFields.every(f => f.id === 'ldac:Dialogue')).toBe(true);
    expect(mappedFields.every(f => f.name === 'Dialogue')).toBe(true);
  });

  it('should map narrative genres to ldac:Narrative', () => {
    const result = mapper.mapFields(['narrative', 'personal_narrative', 'folktale', 'oral_history', 'mythology']);
    
    const mappedFields = result.mappedFields;
    expect(mappedFields).toHaveLength(5);
    expect(mappedFields.every(f => f.id === 'ldac:Narrative')).toBe(true);
    expect(mappedFields.every(f => f.name === 'Narrative')).toBe(true);
  });

  it('should map procedural genres to ldac:Procedural', () => {
    const result = mapper.mapFields(['procedural_discourse', 'procedural_text']);
    
    const mappedFields = result.mappedFields;
    expect(mappedFields).toHaveLength(2);
    expect(mappedFields.every(f => f.id === 'ldac:Procedural')).toBe(true);
    expect(mappedFields.every(f => f.name === 'Procedural')).toBe(true);
  });

  it('should map formulaic genres to ldac:Formulaic', () => {
    const result = mapper.mapFields(['formulaic_discourse', 'ritual']);
    
    const mappedFields = result.mappedFields;
    expect(mappedFields).toHaveLength(2);
    expect(mappedFields.every(f => f.id === 'ldac:Formulaic')).toBe(true);
    expect(mappedFields.every(f => f.name === 'Formulaic')).toBe(true);
  });

  it('should map ludic genres to ldac:Ludic', () => {
    const result = mapper.mapFields(['language_play', 'ludic', 'verbal_art', 'singing', 'song']);
    
    const mappedFields = result.mappedFields;
    expect(mappedFields).toHaveLength(5);
    expect(mappedFields.every(f => f.id === 'ldac:Ludic')).toBe(true);
    expect(mappedFields.every(f => f.name === 'Ludic')).toBe(true);
  });

  it('should map interview to ldac:Interview', () => {
    const result = mapper.mapFields(['interview']);
    
    const mappedField = result.mappedFields[0];
    expect(mappedField.id).toBe('ldac:Interview');
    expect(mappedField.name).toBe('Interview');
  });

  it('should map drama to ldac:Drama', () => {
    const result = mapper.mapFields(['drama']);
    
    const mappedField = result.mappedFields[0];
    expect(mappedField.id).toBe('ldac:Drama');
    expect(mappedField.name).toBe('Drama');
  });

  it('should map report to ldac:Report', () => {
    const result = mapper.mapFields(['report']);
    
    const mappedField = result.mappedFields[0];
    expect(mappedField.id).toBe('ldac:Report');
    expect(mappedField.name).toBe('Report');
  });

  it('should map oratory to ldac:Oratory', () => {
    const result = mapper.mapFields(['oratory']);
    
    const mappedField = result.mappedFields[0];
    expect(mappedField.id).toBe('ldac:Oratory');
    expect(mappedField.name).toBe('Oratory');
  });

  it('should map description to ldac:Informational', () => {
    const result = mapper.mapFields(['description']);
    
    const mappedField = result.mappedFields[0];
    expect(mappedField.id).toBe('ldac:Informational');
    expect(mappedField.name).toBe('Informational');
  });

  it('should create custom terms for unmapped genres', () => {
    const unmappedGenres = ['proverb', 'photograph', 'map', 'dictionary', 'grammar'];
    const result = mapper.mapFields(unmappedGenres);
    
    const customFields = result.mappedFields.filter(f => f.id.startsWith('#'));
    expect(customFields).toHaveLength(5);
    
    expect(customFields.some(f => f.id === '#Proverb')).toBe(true);
    expect(customFields.some(f => f.id === '#Photograph')).toBe(true);
    expect(customFields.some(f => f.id === '#Map')).toBe(true);
    expect(customFields.some(f => f.id === '#Dictionary')).toBe(true);
    expect(customFields.some(f => f.id === '#Grammar')).toBe(true);
  });

  it('should include proper descriptions for LDAC terms', () => {
    const result = mapper.mapFields(['dialog']);
    
    const dialogueField = result.mappedFields[0];
    expect(dialogueField.description).toBeDefined();
    expect(dialogueField.description).toContain('interactive discourse');
    expect(dialogueField.description).toContain('two or more participants');
  });

  it('should handle case-insensitive mapping', () => {
    const result = mapper.mapFields(['NARRATIVE', 'Interview', 'dRaMa']);
    
    expect(result.mappedFields).toHaveLength(3);
    expect(result.mappedFields.some(f => f.id === 'ldac:Narrative')).toBe(true);
    expect(result.mappedFields.some(f => f.id === 'ldac:Interview')).toBe(true);
    expect(result.mappedFields.some(f => f.id === 'ldac:Drama')).toBe(true);
  });

  it('should create both term sets when needed', () => {
    const result = mapper.mapFields(['narrative', 'custom_genre']);
    
    expect(Object.keys(result.termSets)).toHaveLength(2);
    expect(result.termSets['ldac:LinguisticGenreTerms']).toBeDefined();
    expect(result.termSets['#CustomGenreTerms']).toBeDefined();
  });
});