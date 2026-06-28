const { defineConfig } = require('vite');
const uni = require('@dcloudio/vite-plugin-uni').default;
const { resolve } = require('path');

module.exports = defineConfig({
  plugins: [uni()],
  base: '/',
  resolve: {
    alias: [
      // Patch @vue/shared's def() to default writable=true.
      //
      // Root cause: uni-app's Vue runtime (3.4.21 fork) calls def(children, "_", type)
      // in initSlots without a writable argument. This makes "_" non-writable.
      // Later, updateSlots calls Object.assign(slots, children) which tries to
      // overwrite slots._ → TypeError: Cannot assign to read only property '_'.
      //
      // Fix: Redirect bare "@vue/shared" imports to our wrapper that overrides def()
      // with writable=true default. The regex /^@vue\/shared$/ matches ONLY bare
      // imports — deep paths like "@vue/shared/dist/..." bypass this alias and
      // resolve to the real package, avoiding circular dependency.
      {
        find: /^@vue\/shared$/,
        replacement: resolve(__dirname, 'src/patches/vue-shared.js'),
      },
      {
        find: '@',
        replacement: resolve(__dirname, 'src'),
      },
    ],
  },
});
