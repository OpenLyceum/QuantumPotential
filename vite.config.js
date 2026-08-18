import { defineConfig } from "vite";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // Bundle analysis - generates stats.html in the project root
    // Set to false in normal builds, enable with ANALYZE=true npm run build
    process.env.ANALYZE === "true" &&
      visualizer({
        filename: "./dist/stats.html",
        open: false,
        gzipSize: true,
        brotliSize: true,
        template: "treemap", // treemap, sunburst, network
      }),
  ].filter(Boolean),
  // So the build can be served from an arbitrary path
  base: "./",
  build: {
    chunkSizeWarningLimit: 2000,
    // Enable terser for better minification and tree shaking
    minify: "terser",
    terserOptions: {
      compress: {
        // Remove unused code
        dead_code: true,
        drop_console: false, // Keep console for debugging
        drop_debugger: true,
        passes: 2, // Multiple passes for better optimization
        unused: true, // Remove unused variables and functions
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false, // Remove comments
      },
    },
    // Tree shaking is enabled by default and respects the sideEffects field in
    // package.json. The former rollupOptions.treeshake.preset option is not a
    // valid input option for Vite 8's Rolldown-based bundler and was ignored.
  },
});
