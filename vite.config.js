import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  base: '/trip-map-anim/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    include: [
      'tests/composables/**/*.js',
      'tests/components/**/*.js',
      'tests/unit/**/*.js',
    ],
    globals: true,
  },
})