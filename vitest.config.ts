import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    typecheck: {
      include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
        'src/main.tsx',
      ],
    },
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    // Platform-specific test environment variables
    env: {
      TEST_PLATFORM: process.env.TEST_PLATFORM || 'web',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Tauri API mocks - order matters: more specific paths first
      '@tauri-apps/api/core': path.resolve(__dirname, './src/test/mocks/tauri.ts'),
      '@tauri-apps/api/event': path.resolve(__dirname, './src/test/mocks/tauri.ts'),
      '@tauri-apps/api/window': path.resolve(__dirname, './src/test/mocks/tauri.ts'),
      '@tauri-apps/api': path.resolve(__dirname, './src/test/mocks/tauri.ts'),
      '@tauri-apps/plugin-dialog': path.resolve(__dirname, './src/test/mocks/tauri-dialog.ts'),
      '@tauri-apps/plugin-fs': path.resolve(__dirname, './src/test/mocks/tauri-fs.ts'),
      '@tauri-apps/plugin-os': path.resolve(__dirname, './src/test/mocks/tauri-os.ts'),
    },
  },
});