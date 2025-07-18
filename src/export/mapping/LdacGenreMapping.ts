/**
 * LDAC Genre Mapping Configuration
 * 
 * Maps lameta genres to LDAC profile linguistic genres based on:
 * https://raw.githubusercontent.com/Language-Research-Technology/ldac-profile/refs/heads/master/profile/profile.md
 */

import { MappingConfiguration } from "./GenericFieldMapper";

export const ldacGenreMappingConfiguration: MappingConfiguration = {
  defaultTermSet: "ldac:LinguisticGenreTerms",
  customTermSet: "#CustomGenreTerms",
  mappings: [
    // Direct mappings to LDAC profile genres
    {
      lametaId: "dialog",
      externalId: "ldac:Dialogue",
      externalLabel: "Dialogue",
      externalDescription: "An interactive discourse with two or more participants. Examples of dialogues include conversations, interviews, correspondence, consultations, greetings and leave-takings."
    },
    {
      lametaId: "dialog", // Alternative spelling
      externalId: "ldac:Dialogue", 
      externalLabel: "Dialogue",
      externalDescription: "An interactive discourse with two or more participants. Examples of dialogues include conversations, interviews, correspondence, consultations, greetings and leave-takings."
    },
    {
      lametaId: "conversation",
      externalId: "ldac:Dialogue",
      externalLabel: "Dialogue", 
      externalDescription: "An interactive discourse with two or more participants. Examples of dialogues include conversations, interviews, correspondence, consultations, greetings and leave-takings."
    },
    {
      lametaId: "interview",
      externalId: "ldac:Interview",
      externalLabel: "Interview",
      externalDescription: "A structured conversation where one participant asks questions and another provides answers."
    },
    {
      lametaId: "drama",
      externalId: "ldac:Drama",
      externalLabel: "Drama",
      externalDescription: "A planned, creative, rendition of discourse involving two or more participants."
    },
    {
      lametaId: "narrative",
      externalId: "ldac:Narrative", 
      externalLabel: "Narrative",
      externalDescription: "A monologic discourse which represents temporally organized events."
    },
    {
      lametaId: "personal_narrative",
      externalId: "ldac:Narrative",
      externalLabel: "Narrative",
      externalDescription: "A monologic discourse which represents temporally organized events."
    },
    {
      lametaId: "folktale",
      externalId: "ldac:Narrative",
      externalLabel: "Narrative", 
      externalDescription: "A monologic discourse which represents temporally organized events."
    },
    {
      lametaId: "oral_history",
      externalId: "ldac:Narrative",
      externalLabel: "Narrative",
      externalDescription: "A monologic discourse which represents temporally organized events."
    },
    {
      lametaId: "mythology",
      externalId: "ldac:Narrative",
      externalLabel: "Narrative",
      externalDescription: "A monologic discourse which represents temporally organized events."
    },
    {
      lametaId: "procedural_discourse", 
      externalId: "ldac:Procedural",
      externalLabel: "Procedural",
      externalDescription: "An explanation or description of a method, process, or situation having ordered steps."
    },
    {
      lametaId: "procedural_text",
      externalId: "ldac:Procedural",
      externalLabel: "Procedural",
      externalDescription: "An explanation or description of a method, process, or situation having ordered steps."
    },
    {
      lametaId: "report",
      externalId: "ldac:Report",
      externalLabel: "Report",
      externalDescription: "A factual account of some event or circumstance."
    },
    {
      lametaId: "oratory",
      externalId: "ldac:Oratory", 
      externalLabel: "Oratory",
      externalDescription: "Public speaking, or speaking eloquently according to rules or conventions."
    },
    {
      lametaId: "formulaic_discourse",
      externalId: "ldac:Formulaic",
      externalLabel: "Formulaic",
      externalDescription: "A ritually or conventionally structured discourse."
    },
    {
      lametaId: "ritual",
      externalId: "ldac:Formulaic",
      externalLabel: "Formulaic",
      externalDescription: "A ritually or conventionally structured discourse."
    },
    {
      lametaId: "language_play",
      externalId: "ldac:Ludic",
      externalLabel: "Ludic",
      externalDescription: "Language whose primary function is to be part of play, or a style of speech that involves a creative manipulation of the structures of the language."
    },
    {
      lametaId: "ludic",
      externalId: "ldac:Ludic",
      externalLabel: "Ludic", 
      externalDescription: "Language whose primary function is to be part of play, or a style of speech that involves a creative manipulation of the structures of the language."
    },
    {
      lametaId: "verbal_art",
      externalId: "ldac:Ludic",
      externalLabel: "Ludic",
      externalDescription: "Language whose primary function is to be part of play, or a style of speech that involves a creative manipulation of the structures of the language."
    },
    {
      lametaId: "description",
      externalId: "ldac:Informational",
      externalLabel: "Informational", 
      externalDescription: "Discourse whose primary purpose is to convey information."
    },
    {
      lametaId: "singing",
      externalId: "ldac:Ludic", // Singing could be considered ludic or could be its own category
      externalLabel: "Ludic",
      externalDescription: "Language whose primary function is to be part of play, or a style of speech that involves a creative manipulation of the structures of the language."
    },
    {
      lametaId: "song",
      externalId: "ldac:Ludic",
      externalLabel: "Ludic",
      externalDescription: "Language whose primary function is to be part of play, or a style of speech that involves a creative manipulation of the structures of the language."
    }
  ]
};