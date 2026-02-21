import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
  },
  {
    entry: ['demo/demo.ts'],
    outDir: 'demo/dist',
    format: ['esm'],
  },
])
