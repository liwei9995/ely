import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  minify: true,
  outDir: 'dist',
  sourcemap: true,
  clean: true,
})
