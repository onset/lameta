We has so far not found an existing index that has just what we want, so we create one by combining two existing ones. This new index is named "langindex.json" in this directory.
stead, it is more script/dialect focused, so has multiple entries per Ethnologue "language".

"ethnologueDerived.json" comes from a previous version of SayMore... we currently don't know how to re-generate this.

"langtags.json" comes from https://github.com/silnrsi/sldr/tree/master/extras

langtags.json isn't usable on its own because it isn't actually one entry per language. We do use it to make up for two shortcomings of ethnologueDerived.json, namely distinguishing the English name from the Local name. It is likely that when we learn to generate the "ethnologueDerived.json" afresh, we will be able to get these fields directly and can then stop having to combine these two indexes.

In the meantime, if you need to re-generate "langindex.json", uncomment the necessary line in "langindex maker.spec.ts" and run that "test".