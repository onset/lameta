We are using json5 because it supports comments.
We create folders for institutions with files that customize the files under `lameta/`. We are using "lameta" here instead of "factory" or "default" because this folder name shows up as part of the `context` that translators see in Crowdin and we think "factory" and "default" would be confusing to them.

The full catalog of fields is at `lameta/fields.json5`. There will eventually be other things in here like `vocabulary.json5`.
