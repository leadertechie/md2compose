import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    dts({
      rollupTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'md2compose',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['@leadertechie/r2tohtml'],
    },
    minify: false,
    sourcemap: true,
  },
});
