We has so far not found an existing index that has just what we want, so we create one by combining two existing ones. This new index is named "langindex.json" in this directory.


"ethnologueDerived.json" comes from a previous version of SayMore... we currently don't know how to re-generate this.

"langtags.json" would ideally be updated from https://raw.githubusercontent.com/silnrsi/langtags/release/pub/langtags.json. However in May 2021 we dipped into the "master" build because ELAR wanted the latest "Eastern Minyag"/"Western Minyag" info.

langtags.json isn't usable on its own because it has an entry for each BCP47 tag, which is a combination of language, script, and variant. But lameta wants an index that has one language per entry.

We use the langtags.json to make up for two shortcomings of ethnologueDerived.json, namely distinguishing the English name from the Local name. It is likely that when we learn to generate the "ethnologueDerived.json" afresh, we will be able to get these fields directly and can then stop having to combine these two indexes.

In the meantime, if you need to re-generate "langindex.json", uncomment the necessary line in "langindex maker.spec.ts" and run that "test".