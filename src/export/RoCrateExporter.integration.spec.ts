/**
 * Integration test for RoCrateExporter with realistic genre mapping scenarios
 */

import { describe, it, expect } from 'vitest';
import { RoCrateExporter } from './RoCrateExporter';

describe('RoCrateExporter Integration', () => {
  it('should export a complete ro-crate matching the example format', () => {
    const exporter = new RoCrateExporter();
    
    // Create a mock project with realistic data
    const mockProject = {
      properties: {
        getValue: vi.fn(() => ({ text: 'Language Documentation Project' }))
      },
      sessions: {
        items: [
          {
            id: 'session-1',
            properties: {
              getValue: vi.fn((key: string) => {
                switch (key) {
                  case 'title':
                    return { text: 'Fishing' };
                  case 'genre':
                    return { text: 'dialog' }; // Maps to ldac:Dialogue
                  case 'description':
                    return { text: 'A conversation about traditional fishing techniques' };
                  case 'date':
                    return { asISODateString: () => '2023-01-15' };
                  default:
                    return null;
                }
              })
            }
          },
          {
            id: 'session-2',
            properties: {
              getValue: vi.fn((key: string) => {
                switch (key) {
                  case 'title':
                    return { text: 'Collecting Pandanus' };
                  case 'genre':
                    return { text: 'avoidance language' }; // Custom genre
                  case 'description':
                    return { text: 'Traditional avoidance speech used in certain social contexts' };
                  default:
                    return null;
                }
              })
            }
          }
        ]
      }
    } as any;

    const result = exporter.export(mockProject);

    // Verify the structure matches the expected format from the issue
    expect(result['@context']).toEqual({
      schema: "http://schema.org/",
      ldac: "https://w3id.org/ldac/terms#",
      pcdm: "http://pcdm.org/models#"
    });

    // Check metadata descriptor
    const metadataDescriptor = result['@graph'].find(e => e['@id'] === 'ro-crate-metadata.json');
    expect(metadataDescriptor).toEqual({
      '@id': 'ro-crate-metadata.json',
      '@type': 'CreativeWork',
      about: { '@id': './' },
      conformsTo: { '@id': 'https://w3id.org/ldac/profile' }
    });

    // Check root dataset
    const rootDataset = result['@graph'].find(e => e['@id'] === './');
    expect(rootDataset).toMatchObject({
      '@id': './',
      '@type': ['Dataset', 'RepositoryCollection'],
      name: 'Language Documentation Project',
      hasPart: [
        { '@id': 'session-1' },
        { '@id': 'session-2' }
      ],
      conformsTo: { '@id': 'https://w3id.org/ldac/profile#Collection' }
    });

    // Check session with LDAC genre mapping
    const session1 = result['@graph'].find(e => e['@id'] === 'session-1');
    expect(session1).toMatchObject({
      '@id': 'session-1',
      '@type': ['RepositoryObject', 'CreativeWork'],
      name: 'Fishing',
      'ldac:linguisticGenre': [
        { '@id': 'ldac:Dialogue' }
      ],
      description: 'A conversation about traditional fishing techniques',
      dateCreated: '2023-01-15'
    });

    // Check session with custom genre
    const session2 = result['@graph'].find(e => e['@id'] === 'session-2');
    expect(session2).toMatchObject({
      '@id': 'session-2',
      '@type': ['RepositoryObject', 'CreativeWork'],
      name: 'Collecting Pandanus',
      'ldac:linguisticGenre': [
        { '@id': '#AvoidanceLanguage' }
      ],
      description: 'Traditional avoidance speech used in certain social contexts'
    });

    // Check LDAC genre term definition
    const dialogueTerm = result['@graph'].find(e => e['@id'] === 'ldac:Dialogue');
    expect(dialogueTerm).toMatchObject({
      '@id': 'ldac:Dialogue',
      '@type': 'DefinedTerm',
      name: 'Dialogue',
      description: 'An interactive discourse with two or more participants. Examples of dialogues include conversations, interviews, correspondence, consultations, greetings and leave-takings.',
      inDefinedTermSet: { '@id': 'ldac:LinguisticGenreTerms' }
    });

    // Check custom genre term definition
    const customTerm = result['@graph'].find(e => e['@id'] === '#AvoidanceLanguage');
    expect(customTerm).toMatchObject({
      '@id': '#AvoidanceLanguage',
      '@type': 'DefinedTerm',
      name: 'avoidance language',
      inDefinedTermSet: { '@id': '#CustomGenreTerms' }
    });

    // Check LDAC term set
    const ldacTermSet = result['@graph'].find(e => e['@id'] === 'ldac:LinguisticGenreTerms');
    expect(ldacTermSet).toMatchObject({
      '@id': 'ldac:LinguisticGenreTerms',
      '@type': 'DefinedTermSet',
      name: 'Linguistic Genre Terms'
    });

    // Check custom term set
    const customTermSet = result['@graph'].find(e => e['@id'] === '#CustomGenreTerms');
    expect(customTermSet).toMatchObject({
      '@id': '#CustomGenreTerms',
      '@type': 'DefinedTermSet',
      name: 'Custom Project Genres'
    });

    // Verify we have all expected entities
    expect(result['@graph']).toHaveLength(8); // metadata, root, 2 sessions, 2 terms, 2 term sets
  });

  it('should handle multiple LDAC genres correctly', () => {
    const exporter = new RoCrateExporter();
    
    const mockProject = {
      properties: {
        getValue: vi.fn(() => ({ text: 'Test Project' }))
      },
      sessions: {
        items: [
          {
            id: 'mixed-session',
            properties: {
              getValue: vi.fn((key: string) => {
                switch (key) {
                  case 'title':
                    return { text: 'Mixed Content Session' };
                  case 'genre':
                    return { text: 'narrative, interview, custom genre' };
                  default:
                    return null;
                }
              })
            }
          }
        ]
      }
    } as any;

    const result = exporter.export(mockProject);
    
    const session = result['@graph'].find(e => e['@id'] === 'mixed-session');
    expect(session?.['ldac:linguisticGenre']).toHaveLength(3);
    
    const genreIds = session?.['ldac:linguisticGenre'].map((g: any) => g['@id']);
    expect(genreIds).toContain('ldac:Narrative');
    expect(genreIds).toContain('ldac:Interview');
    expect(genreIds).toContain('#CustomGenre');

    // Should have both LDAC and custom term sets
    const ldacTermSet = result['@graph'].find(e => e['@id'] === 'ldac:LinguisticGenreTerms');
    const customTermSet = result['@graph'].find(e => e['@id'] === '#CustomGenreTerms');
    expect(ldacTermSet).toBeDefined();
    expect(customTermSet).toBeDefined();
  });
});