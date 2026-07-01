/**
 * Build config for the Electron MAIN process (electron-main.ts + preload.ts).
 *
 * This is intentionally separate from vite.config.ts (which builds the
 * renderer). Plain `tsc` cannot resolve the @services/@native/etc. path
 * aliases used throughout the codebase into valid runtime `require()` calls,
 * so the main process is bundled with Vite/Rollup instead, which resolves
 * every alias at build time into a single, dependency-free CommonJS file
 * per entry point.
 */

import { defineConfig } from 'vite'
import path from 'path'

const nodeBuiltins = [
  'electron',
  'fs',
  'fs/promises',
  'path',
  'os',
  'dns',
  'net',
  'child_process',
  'util',
  'events',
  'stream',
  'url',
  'crypto',
]

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@main': path.resolve(__dirname, './src/main'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@native': path.resolve(__dirname, './src/native'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types'),
      '@services': path.resolve(__dirname, './src/services'),
      '@config': path.resolve(__dirname, './src/config'),
    },
  },
  build: {
    outDir: 'dist/main',
    emptyOutDir: true,
    target: 'node18',
    minify: false,
    sourcemap: true,
    rollupOptions: {
      input: {
        'electron-main': path.resolve(__dirname, 'src/main/electron-main.ts'),
        preload: path.resolve(__dirname, 'src/main/preload.ts'),
      },
      output: {
        format: 'cjs',
        entryFileNames: '[name].js',
      },
      external: nodeBuiltins,
    },
  },
})
