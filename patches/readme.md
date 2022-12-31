About the Fluent-ffmpeg patch: https://github.com/fluent-ffmpeg/node-fluent-ffmpeg/issues/573
For some reason fluent-ffmpeg behaves as if the env variable that they have for running their own tests is set. I tried all the options in the github issue, to no avail, so I patched it.

About the fs-extra patch. Some combination of factors is making the graceful-fs fail to patch at runtime. So I removed fs-extra's use of it for now.
