import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./setupTests.ts'],
    include: ['**/*.test.{ts,tsx}'],
    server: {
      deps: {
        inline: [
          'react-native',
          '@testing-library/react-native',
          'expo-constants',
          'expo-secure-store',
          'expo-linear-gradient',
          'expo-camera',
          '@expo/vector-icons'
        ],
      },
    },
  },
});
