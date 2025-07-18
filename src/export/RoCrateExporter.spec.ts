/**
 * Unit tests for RoCrateExporter  
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RoCrateExporter } from './RoCrateExporter';
import { Project } from '../model/Project/Project';
import { Session } from '../model/Project/Session/Session';

// Mock the required classes
vi.mock('../model/Project/Project');
vi.mock('../model/Project/Session/Session');

describe('RoCrateExporter', () => {
  let exporter: RoCrateExporter;
  let mockProject: Project;
  let mockSession1: Session;
  let mockSession2: Session;

  beforeEach(() => {
    exporter = new RoCrateExporter();
    
    // Create mock sessions
    mockSession1 = {
      id: 'session-1',
      properties: {
        getValue: vi.fn((key: string) => {
          switch (key) {
            case 'title':
              return { text: 'Fishing' };
            case 'genre':
              return { text: 'dialog' };
            case 'description':
              return { text: 'A conversation about fishing' };
            case 'date':
              return { asISODateString: () => '2023-01-15' };
            default:
              return null;
          }
        })
      }
    } as any;

    mockSession2 = {
      id: 'session-2', 
      properties: {
        getValue: vi.fn((key: string) => {
          switch (key) {
            case 'title':
              return { text: 'Collecting Pandanus' };
            case 'genre':
              return { text: 'avoidance language' };
            case 'description':
              return { text: 'Traditional avoidance speech' };
            default:
              return null;
          }
        })
      }
    } as any;

    // Create mock project
    mockProject = {
      properties: {
        getValue: vi.fn((key: string) => {
          if (key === 'title') {
            return { text: 'Test Project' };
          }
          return null;
        })
      },
      sessions: {
        items: [mockSession1, mockSession2]
      }
    } as any;
  });

  it('should create valid RO-Crate structure', () => {
    const result = exporter.export(mockProject);

    expect(result['@context']).toBeDefined();
    expect(result['@context'].schema).toBe('http://schema.org/');
    expect(result['@context'].ldac).toBe('https://w3id.org/ldac/terms#');
    expect(result['@context'].pcdm).toBe('http://pcdm.org/models#');
    
    expect(result['@graph']).toBeDefined();
    expect(Array.isArray(result['@graph'])).toBe(true);
  });

  it('should include metadata descriptor', () => {
    const result = exporter.export(mockProject);
    
    const metadataDescriptor = result['@graph'].find(entity => entity['@id'] === 'ro-crate-metadata.json');
    expect(metadataDescriptor).toBeDefined();
    expect(metadataDescriptor?.['@type']).toBe('CreativeWork');
    expect(metadataDescriptor?.about).toEqual({ '@id': './' });
    expect(metadataDescriptor?.conformsTo).toEqual({ '@id': 'https://w3id.org/ldac/profile' });
  });

  it('should include root dataset', () => {
    const result = exporter.export(mockProject);
    
    const rootDataset = result['@graph'].find(entity => entity['@id'] === './');
    expect(rootDataset).toBeDefined();
    expect(rootDataset?.['@type']).toEqual(['Dataset', 'RepositoryCollection']);
    expect(rootDataset?.name).toBe('Test Project');
    expect(rootDataset?.conformsTo).toEqual({ '@id': 'https://w3id.org/ldac/profile#Collection' });
    
    expect(rootDataset?.hasPart).toBeDefined();
    expect(rootDataset?.hasPart).toHaveLength(2);
    expect(rootDataset?.hasPart).toContainEqual({ '@id': 'session-1' });
    expect(rootDataset?.hasPart).toContainEqual({ '@id': 'session-2' });
  });

  it('should include session entities', () => {
    const result = exporter.export(mockProject);
    
    const session1 = result['@graph'].find(entity => entity['@id'] === 'session-1');
    expect(session1).toBeDefined();
    expect(session1?.['@type']).toEqual(['RepositoryObject', 'CreativeWork']);
    expect(session1?.name).toBe('Fishing');
    expect(session1?.description).toBe('A conversation about fishing');
    expect(session1?.dateCreated).toBe('2023-01-15');

    const session2 = result['@graph'].find(entity => entity['@id'] === 'session-2');
    expect(session2).toBeDefined();
    expect(session2?.['@type']).toEqual(['RepositoryObject', 'CreativeWork']);
    expect(session2?.name).toBe('Collecting Pandanus');
    expect(session2?.description).toBe('Traditional avoidance speech');
  });

  it('should map LDAC genres correctly', () => {
    const result = exporter.export(mockProject);
    
    const session1 = result['@graph'].find(entity => entity['@id'] === 'session-1');
    expect(session1?.['ldac:linguisticGenre']).toBeDefined();
    expect(session1?.['ldac:linguisticGenre']).toHaveLength(1);
    expect(session1?.['ldac:linguisticGenre'][0]).toEqual({ '@id': 'ldac:Dialogue' });
  });

  it('should create custom genre terms for unmapped genres', () => {
    const result = exporter.export(mockProject);
    
    const session2 = result['@graph'].find(entity => entity['@id'] === 'session-2');
    expect(session2?.['ldac:linguisticGenre']).toBeDefined();
    expect(session2?.['ldac:linguisticGenre']).toHaveLength(1);
    expect(session2?.['ldac:linguisticGenre'][0]).toEqual({ '@id': '#AvoidanceLanguage' });
  });

  it('should include LDAC genre term definitions', () => {
    const result = exporter.export(mockProject);
    
    const dialogueTerm = result['@graph'].find(entity => entity['@id'] === 'ldac:Dialogue');
    expect(dialogueTerm).toBeDefined();
    expect(dialogueTerm?.['@type']).toBe('DefinedTerm');
    expect(dialogueTerm?.name).toBe('Dialogue');
    expect(dialogueTerm?.description).toContain('interactive discourse');
    expect(dialogueTerm?.inDefinedTermSet).toEqual({ '@id': 'ldac:LinguisticGenreTerms' });
  });

  it('should include custom genre term definitions', () => {
    const result = exporter.export(mockProject);
    
    const customTerm = result['@graph'].find(entity => entity['@id'] === '#AvoidanceLanguage');
    expect(customTerm).toBeDefined();
    expect(customTerm?.['@type']).toBe('DefinedTerm');
    expect(customTerm?.name).toBe('avoidance language');
    expect(customTerm?.inDefinedTermSet).toEqual({ '@id': '#CustomGenreTerms' });
  });

  it('should include term set definitions', () => {
    const result = exporter.export(mockProject);
    
    const ldacTermSet = result['@graph'].find(entity => entity['@id'] === 'ldac:LinguisticGenreTerms');
    expect(ldacTermSet).toBeDefined();
    expect(ldacTermSet?.['@type']).toBe('DefinedTermSet');
    expect(ldacTermSet?.name).toBe('Linguistic Genre Terms');

    const customTermSet = result['@graph'].find(entity => entity['@id'] === '#CustomGenreTerms');
    expect(customTermSet).toBeDefined();
    expect(customTermSet?.['@type']).toBe('DefinedTermSet'); 
    expect(customTermSet?.name).toBe('Custom Project Genres');
  });

  it('should handle multiple genres in a single session', () => {
    // Modify session to have multiple genres
    mockSession1.properties.getValue = vi.fn((key: string) => {
      if (key === 'genre') {
        return { text: 'dialog, narrative' };
      }
      if (key === 'title') {
        return { text: 'Fishing' };
      }
      return null;
    });

    const result = exporter.export(mockProject);
    
    const session1 = result['@graph'].find(entity => entity['@id'] === 'session-1');
    expect(session1?.['ldac:linguisticGenre']).toBeDefined();
    expect(session1?.['ldac:linguisticGenre']).toHaveLength(2);
    
    const genreIds = session1?.['ldac:linguisticGenre'].map((g: any) => g['@id']);
    expect(genreIds).toContain('ldac:Dialogue');
    expect(genreIds).toContain('ldac:Narrative');
  });

  it('should handle sessions without genres', () => {
    // Modify session to have no genre
    mockSession1.properties.getValue = vi.fn((key: string) => {
      if (key === 'title') {
        return { text: 'Fishing' };
      }
      return null;
    });

    const result = exporter.export(mockProject);
    
    const session1 = result['@graph'].find(entity => entity['@id'] === 'session-1');
    expect(session1?.['ldac:linguisticGenre']).toBeUndefined();
  });

  it('should handle empty project gracefully', () => {
    const emptyProject = {
      properties: {
        getValue: vi.fn(() => ({ text: 'Empty Project' }))
      },
      sessions: {
        items: []
      }
    } as any;

    const result = exporter.export(emptyProject);
    
    expect(result['@graph']).toBeDefined();
    expect(result['@graph'].length).toBeGreaterThanOrEqual(2); // At least metadata and root dataset
    
    const rootDataset = result['@graph'].find(entity => entity['@id'] === './');
    expect(rootDataset?.hasPart).toEqual([]);
  });
});