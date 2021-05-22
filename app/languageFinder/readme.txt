For language lookup, lameta uses an index file that we create. It is named "langindex.json" and it lives in this directory.

Our source is for the langindex is "langtags.json", from https://github.com/silnrsi/langtags. This file is organized by "tag", which apparently means BCP47 tags ( language + script + variant). We process that into "langindex.json", which has one entry for each iso 639 language. This is probably not ideal, as it then merges together all variants, including dialects and scripts.

"langtags.json" would ideally be updated from 
. However in May 2021 we dipped into the "master" build because ELAR wanted the latest "Eastern Minyag"/"Western Minyag" info.

To re-generate "langindex.json", do `yarn make-langindex`.