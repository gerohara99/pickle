const { defineConfig } = require("vite");
const path = require("path");

module.exports = defineConfig({
  root: path.resolve(__dirname, "public/js"),
  build: {
    manifest: true,
    outDir: path.resolve(__dirname, "public/js/dist"),
    emptyOutDir: true,
    sourcemap: false,
    assetsDir: "assets",
    rollupOptions: {
      input: path.resolve(__dirname, "public/js/index.js"),
    },
  },
});
