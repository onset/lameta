# inLanguage

LDAC expects us to know what language the session was in. We should use the session's "workingLanguages" field. If it is missing, we could export "unk" which is a valid tag for unknown. Of course it needs all the necessary entities in our export, just like a real language.

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
