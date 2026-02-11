import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    external: ['react', 'react-dom'],
    sourcemap: true,
    clean: true,
  },
  {
    entry: ['src/mount.ts'],
    format: ['iife'],
    globalName: 'ThunderPhone',
    outDir: 'dist',
    outExtension: () => ({ js: '.global.js' }),
    noExternal: ['react', 'react-dom', 'livekit-client', '@livekit/components-react'],
    sourcemap: true,
  },
])
