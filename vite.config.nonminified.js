import { defineConfig } from "vite-plus";
import baseConfig from "./vite.config";

export default defineConfig({
  ...baseConfig,
  build: {
    ...baseConfig.build,
    minify: false,
    cssMinify: false
  }
});
