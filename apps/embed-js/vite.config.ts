import { defineConfig } from 'vite';

// No dependencies, only `import type` from the contract, so the output is a
// few hundred bytes. For a real npm publish, also bundle the .d.ts
// (e.g. tsup --dts or api-extractor) so partners get the contract types.
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: () => 'index.js' },
  },
});
