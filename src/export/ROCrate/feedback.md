# Notes on Lameta RO-Crate output

Context:  
Core RO-Crate context correctly included  
[Schema.org](http://Schema.org) vocab correctly included

"http://purl.archive.org/language-data-commons/context.json",  
"[https://w3id.org/ldac/context](https://w3id.org/ldac/context)",  
Only  a single context can be included, which must be the core RO-Crate context. To include the LDaCA ontology the correct method to use the below and use an ldac: prefix for terms taken from the ldac: ontology  
   {  
"ldac":"http://w3id.org/ldac/terms\#"  
   }

   {  
      "Dataset": "http://schema.org/Dataset",  
      "name": "http://schema.org/name",  
      "description": "http://schema.org/description",  
      "datePublished": "http://schema.org/datePublished",  
      "license": "http://schema.org/license",  
      "pcdm": "http://pcdm.org/models\#"  
    }

These are part of the core RO-Crate context or [schema.org](http://schema.org), it is not required to include these individually.

"@type": \[  
        "Dataset",  
        "pcdm:Collection"  
      \],

Dataset is correct. In the RO-Crate Context pcdm:Collection is mapped to RepositoryCollection, so this term should be used.

Description is currently empty. Per the RO-Crate specification:  
`description`: SHOULD further elaborate on the name to provide a summary of the context in which the dataset is important.

So although the description field being present, it is currently empty, and will fail validation, and cause issues with processing as most libraries see the empty field as a missing field.

"publisher": {  
        "@id": "https://github.com/onset/lameta"  
      },  
This may be an artifact of the testing process, however the publisher should be the person or organization that is responsible for making the material available, not the LaMeta software. This applies at both the RepositoryCollection and RepositoryObject levels.

"author": {  
        "@id": "\#unknown-contributor"  
      },  
      "accountablePerson": {  
        "@id": "\#unknown-contributor"  
      },  
      "dct:rightsHolder": {  
        "@id": "\#unknown-contributor"  
      },  
Presumably this is an artifact of this being a test instance. However the Accountable Person and Rights Holder should resolve to a valid Person or Organization rather than to ‘unknown’

"hasPart": \[  
        {  
          "@id": "People/Erakor%20Pics/Erakor%20Pics.sprj"  
        },  
        {  
          ~~"@id": "People/Nick\_Thieberger/"~~  
        ~~},~~  
        …  
      \],

hasPart is used for RO-Crate Data Entities  (File and Dataset (directory)) that are part of the Root Data Entity it appears that LaMeta is outputting Person entities in this field.

"archiveConfigurationName": "PARADISEC",  
archiveConfigurationName is an undefined term, so this would need to be defined as part of the context with the definition in the crate if it cannot be mapped to an alternative field. Based on the available data perhaps this should actually be ‘publisher’?

"depositor": "Nick Thieberger",  
Depositor has been used inconsistently between the Root Dataset and the objects contained within the crate. The correct usage is as appears in the crate, as ldac:depositor with a person entity linked.

"country": "Vanuatu",  
"continent": "Oceania",  
Country and continent are not [schema.org](http://schema.org) or core RO-crate terms. They will need to be defined in context of the crate. They could also be included under contentLocation as place objects.

       
 "ldac:subjectLanguage": \[  
        {  
          "@id": "\#language\_und"  
        }  
      \]  
subjectLanguage is not a required field for an LDAC compliant crate, but (schema:)inLanguage is. This may need some discussion on how to include this data for where a language has not yet been determined.

{  
      "@id": "Sessions/NT5-200501-01.tab\_NT5-200501-A.mp3\_NT5-200501-A.wav\_NT5-200501-A.xml\_NT5-200501-A.eaf/",

@id for a Data Entity needs to be a URI relative to the Root Dataset, or an absolute URI \- see [https://www.researchobject.org/ro-crate/specification/1.2/data-entities\#core-metadata-for-data-entities](https://www.researchobject.org/ro-crate/specification/1.2/data-entities#core-metadata-for-data-entities). In this case, as there does not appear to be a root URI, the IDs for non-File entities should start with ‘\#’ (as has been correctly applied for the license and the language)

      "@type": \[  
        "Dataset",  
        "pcdm:Object",  
        "Event"  
      \],  
pcdm:Object is mapped in the RO-Crate specification to RepositoryObject, so this term should be used. Dataset is only required on the Root Dataset when all entities are being output as a single crate.

      "ldac:linguisticGenre": \[  
        {  
          "@id": "ldac:Song"  
        }  
      \],  
The @id for this should be the w3id link to the term ("[https://w3id.org/ldac/](https://w3id.org/ldac/context)terms\#Song”)

      "involvement": "non-elicited",  
      "planningType": "spontaneous",  
      "socialContext": "public",  
These fields are not defined in [schema.org](http://schema.org) so would need need to be defined as part of the crate as custom fields – OR Nick can bring them to the Language Data Commons Metadata standards group for consideration as part of the LDaC Schema 

Author, rightsHolder and accountablePerson are missing from the object, these are required fields for LDaC compliant metadata.

{  
      "@id": "People/Nick\_Thieberger/Nick\_Thieberger.person",  
      "@type": "DigitalDocument",  
      "contentSize": 223,  
      "dateCreated": "2021-12-02T05:22:49.000Z",  
      "dateModified": "2021-12-02T05:22:49.490Z",  
      "encodingFormat": "application/lameta-person",  
      "ldac:materialType": {  
        "@id": "ldac:Annotation"  
      },  
      "name": "Nick\_Thieberger.person"  
    },

Presumably this is a record for the on-disc storage of a Person’s profile? I’m not sure if this need to be included in the crate \- and perhaps should not be from a privacy perspective?  
If this is included, then the ldac:materialType should be the full URI rather than the shorthand form (i.e. [https://w3id.org/ldac/terms\#Annotation](https://w3id.org/ldac/terms#Annotation)).  
Additionally, if this is an annotation there should be an ldac:annotationOf reference back to the item that it is an annotation of, and a ldac:hasAnnotation reference on the original object. Based on the information contained in the RO-Crate this does not appear to be an actual annotation

   {  
      "@id": "People/Nick\_Thieberger/",  
      "@type": "Person",  
      "name": "Nick Thieberger",  
      "hasPart": \[  
        {  
          "@id": "People/Nick\_Thieberger/Nick\_Thieberger.person"  
        }  
      \]  
    },

It is preferred that, where possible, the @id for a person is an ORCID, or other PI. If a PI is not available, then the @id for a Person entity should start with ‘\#’. Person entities also cannot have a hasPart property, only Data entities can include a hasPart.

{  
      "@id": "Sessions/NT5-200518-01.tab\_NT5-200518-A.mp3\_NT5-200518-A.wav\_NT5-200518-A.xml\_NT5-200518-A.eaf/NT5-200518-01.tab\_NT5-200518-A.mp3\_NT5-200518-A.wav\_NT5-200518-A.xml\_NT5-200518-A.eaf.session",  
      "@type": "DigitalDocument",  
      "contentSize": 1289,  
      "dateCreated": "2021-12-02T05:22:49.000Z",  
      "dateModified": "2021-12-02T05:22:49.620Z",  
      "encodingFormat": "application/lameta-session",  
      "ldac:materialType": {  
        "@id": "ldac:Annotation"  
      },  
      "name": "NT5-200518-01.tab\_NT5-200518-A.mp3\_NT5-200518-A.wav\_NT5-200518-A.xml\_NT5-200518-A.eaf.session",  
      "license": {  
        "@id": "\#license-paradisec-public"  
      }  
    },

@type should be ‘File’, as this is how RO-Crate defines these.   
ldac:materialType should be the full URI rather than the shorthand form (i.e. [https://w3id.org/ldac/terms\#Annotation](https://w3id.org/ldac/terms#Annotation)).  
As this is an annotation, then there should be an “ldac:annotationOf” field referencing the original material, as well as an “ldac:annotationType” field providing the correct ldac: annotation type.  
It is also preferred that a pronom identifier is supplied as part of the encoding format, however this probably doesn’t make sense for the session objects.

On a more general note, it appears that LaMeta is providing a file for the annotations that are being completed there, however it is not including the original files in the output. If the intention of the RO-Crate is to share the full material, then it may make more sense for all the files to be included, rather than only the LaMeta session object.

