import json from '@rollup/plugin-json';
import commonjs from 'rollup-plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default [
  {
  input: 'src/main.js',
  output: {
    dir: 'output',
    format: 'umd',
    indent: false,
    sourcemap: true,
  },
  plugins: [json(), nodeResolve(), terser(), commonjs()]
  },
];

