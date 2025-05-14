import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import fs from 'fs';
import path from 'path';

// Function to get all TypeScript files in the src directory
function getInputs() {
  const inputs = {};

  // Add the main entry point
  inputs['index'] = 'src/index.ts';

  // Add Recastra.ts
  inputs['Recastra'] = 'src/Recastra.ts';

  // Add core files
  const coreDir = 'src/core';
  if (fs.existsSync(coreDir)) {
    fs.readdirSync(coreDir).forEach(file => {
      if (file.endsWith('.ts') && !file.endsWith('.test.ts') && !file.includes('__tests__')) {
        const name = path.basename(file, '.ts');
        inputs[`core/${name}`] = `${coreDir}/${file}`;
      }
    });
  }

  // Add utils files
  const utilsDir = 'src/utils';
  if (fs.existsSync(utilsDir)) {
    fs.readdirSync(utilsDir).forEach(file => {
      if (file.endsWith('.ts') && !file.endsWith('.test.ts') && !file.includes('__tests__')) {
        const name = path.basename(file, '.ts');
        inputs[`utils/${name}`] = `${utilsDir}/${file}`;
      }
    });
  }

  return inputs;
}

export default defineConfig({
  input: getInputs(),
  output: {
    dir: 'dist',
    format: 'es',
    sourcemap: false,
    preserveModules: true,
    preserveModulesRoot: 'src'
  },
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: 'dist',
      rootDir: 'src'
    }),
    resolve(),
    commonjs(),
    terser({
      format: {
        comments: false
      },
      compress: {
        drop_console: false, // Keep console for debugging
        drop_debugger: true
      }
    }),
  ],
  external: []
});
