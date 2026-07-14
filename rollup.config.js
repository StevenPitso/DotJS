// rollup.config.js (ES Module version)
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

const isProduction = process.env.NODE_ENV === 'production';

// Main bundle config
const mainConfig = {
  input: 'src/main-entry.js',
  output: [
    {
      file: 'dist/dotjs.js',
      format: 'umd',
      name: 'dotjs',
      sourcemap: true,
    },
    {
      file: 'dist/dotjs.min.js',
      format: 'umd',
      name: 'dotjs',
      sourcemap: true,
      plugins: [terser()],
    },
    {
      file: 'dist/dotjs.esm.js',
      format: 'esm',
      sourcemap: true,
    },
  ],
  plugins: [
    resolve({
      browser: true,
      preferBuiltins: false,
    }),
    commonjs(),
  ],
  external: [],
};

// Worker bundle config
const workerConfig = {
  input: 'worker-entry.js',
  output: [
    {
      file: 'dist/dotjs.worker.js',
      format: 'iife',
      name: 'DotWorker',
      sourcemap: true,
    },
    {
      file: 'dist/dotjs.worker.min.js',
      format: 'iife',
      name: 'DotWorker',
      sourcemap: true,
      plugins: [terser()],
    },
  ],
  plugins: [
    resolve({
      browser: true,
      preferBuiltins: false,
    }),
    commonjs(),
  ],
  external: [],
};

export default [mainConfig, workerConfig];