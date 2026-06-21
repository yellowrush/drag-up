const { defineConfig } = require('vite');
const uni = require('@dcloudio/vite-plugin-uni').default;
const { resolve } = require('path');

module.exports = defineConfig({
  plugins: [uni()],
  base: '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
