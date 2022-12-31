About the Fluent-ffmpeg patch: https://github.com/fluent-ffmpeg/node-fluent-ffmpeg/issues/573
For some reason fluent-ffmpeg behaves as if the env variable that they have for running their own tests is set. I tried all the options in the github issue, to no avail, so I patched it.

Note to future self. Several times, older libraries have had bizarre behavior in this project, and I started patching them. But then I found that listing them in vite.config.ts renderer.optimizeDeps.include fixes them.
