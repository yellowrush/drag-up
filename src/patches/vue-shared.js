/**
 * Patch for @vue/shared def() function.
 *
 * Root cause: uni-app's Vue runtime (3.4.21 fork) calls def(children, "_", type)
 * in initSlots without passing writable=true. This makes the "_" property
 * non-writable. Later, updateSlots calls extend(slots, children) which is
 * Object.assign(slots, children), and it crashes with:
 *   TypeError: Cannot assign to read only property '_'
 *
 * Fix: Override the exported def() to default writable=true instead of false.
 * This is safe because def() is only exported (never used internally in @vue/shared),
 * and all callers in the Vue runtime benefit from the writable default.
 *
 * This file is loaded via Vite resolve.alias, so it requires zero node_modules changes.
 * The regex alias /^@vue\/shared$/ matches only bare imports, not deep path imports,
 * so the re-export below resolves to the real @vue/shared without circular dependency.
 */

// Re-export everything from the real @vue/shared (deep path bypasses the alias)
export * from '@vue/shared/dist/shared.esm-bundler.js';

// Override def with writable=true default (original defaults to false)
export const def = (obj, key, value, writable = true) => {
  Object.defineProperty(obj, key, {
    configurable: true,
    enumerable: false,
    writable,
    value,
  });
};
