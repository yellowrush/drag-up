import { defineConfig } from 'vite'
import { resolve } from 'path'

// Vite config for the standalone game (index.html)
// No Vue plugin needed — index.html uses plain JS modules directly
export default defineConfig({
  root: '.',           // project root = where index.html lives
  base: '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    open: '/index.html'  // open game page on dev start
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  }
})
