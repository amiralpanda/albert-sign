import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/** Minimal frontend for sign.atome.software (Vercel — avoids OOM on full presentations build) */
export default defineConfig({
  root: path.resolve(__dirname),
  publicDir: 'public',
  plugins: [
    react(),
    {
      name: 'strip-crossorigin',
      transformIndexHtml(html) {
        return html.replace(/ crossorigin/g, '')
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    postcss: path.resolve(__dirname, 'postcss.config.js'),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'sign.html'),
    },
  },
})
