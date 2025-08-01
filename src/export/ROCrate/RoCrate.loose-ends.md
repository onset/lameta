# missing root collection properties

The root entity is missing author, accountablePerson, and dct:rightsHolder.

# inLanguage

LDAC expects us to know what language the session was in, but we don't have that in the lameta model. (We should!)

```
    "inLanguage": {
    "@id": "#language_etr"
    },
    "ldac:subjectLanguage": [
    {
        "@id": "#language_etr"
    }
    ]
```

# session types

"pcdm:RepositoryObject" --> "pcdm:Object"
