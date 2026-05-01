import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import obfuscatorPlugin from 'rollup-plugin-obfuscator'

const host = process.env.TAURI_DEV_HOST;
const isProduction = process.env.NODE_ENV === 'production';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Tauri expects a fixed port, and fail if that port is not available
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    open: false, // Prevent Vite from auto-opening browser
    hmr: host ? {
      protocol: 'ws',
      host,
      port: 5183,
    } : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ['**/src-tauri/**'],
    },
  },
  
  // To make use of `TAURI_ENV_*` environment variables
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  
  build: {
    // Tauri uses Chrome/WebView2 on Windows, Safari on macOS, and WebKit on Linux
    target: process.env.TAURI_ENV_PLATFORM == 'windows' ? 'chrome105' : 'safari13',
    // Don't minify for debug builds
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    // Produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    rollupOptions: {
      plugins: [
        // Only obfuscate in production builds
        isProduction && !process.env.TAURI_ENV_DEBUG && obfuscatorPlugin({
          options: {
            // Performance-friendly obfuscation settings
            compact: true,
            controlFlowFlattening: false, // Disabled - major performance impact
            deadCodeInjection: false, // Disabled - increases bundle size
            debugProtection: false, // Disabled - can cause issues
            disableConsoleOutput: false, // Keep console for error reporting
            identifierNamesGenerator: 'hexadecimal',
            log: false,
            numbersToExpressions: true,
            renameGlobals: false, // Keep false to avoid breaking imports
            selfDefending: false, // Disabled - can cause issues
            simplify: true,
            splitStrings: true,
            splitStringsChunkLength: 10,
            stringArray: true,
            stringArrayCallsTransform: true,
            stringArrayCallsTransformThreshold: 0.5,
            stringArrayEncoding: ['base64'],
            stringArrayIndexShift: true,
            stringArrayRotate: true,
            stringArrayShuffle: true,
            stringArrayWrappersCount: 1,
            stringArrayWrappersChainedCalls: true,
            stringArrayWrappersParametersMaxCount: 2,
            stringArrayWrappersType: 'variable',
            stringArrayThreshold: 0.75,
            unicodeEscapeSequence: false,
          },
        }),
      ].filter(Boolean),
    },
  },
})
