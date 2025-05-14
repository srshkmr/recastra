import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure dist directory exists
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  console.log('Creating dist directory...');
  fs.mkdirSync(distDir, { recursive: true });
  console.log('Dist directory created');
} else {
  // Clean up any nested core directory inside dist/core to prevent duplication
  const nestedCoreDir = path.join(distDir, 'core', 'core');
  if (fs.existsSync(nestedCoreDir)) {
    console.log('Removing nested core directory to prevent duplication...');
    fs.rmSync(nestedCoreDir, { recursive: true, force: true });
    console.log('Nested core directory removed');
  }

  // Clean up any nested utils directory inside dist/utils if it exists
  const nestedUtilsDir = path.join(distDir, 'utils', 'utils');
  if (fs.existsSync(nestedUtilsDir)) {
    console.log('Removing nested utils directory to prevent duplication...');
    fs.rmSync(nestedUtilsDir, { recursive: true, force: true });
    console.log('Nested utils directory removed');
  }

  // Clean up utils directory inside dist/core to prevent duplication
  const coreUtilsDir = path.join(distDir, 'core', 'utils');
  if (fs.existsSync(coreUtilsDir)) {
    console.log('Removing utils directory inside core to prevent duplication...');
    fs.rmSync(coreUtilsDir, { recursive: true, force: true });
    console.log('Utils directory inside core removed');
  }
}

// Declaration files are now optional, so we don't need to back them up
console.log('Skipping declaration file backup as they are now optional');

// Ensure core directory exists in dist
const distCoreDir = path.join(distDir, 'core');
if (!fs.existsSync(distCoreDir)) {
  console.log('Creating dist/core directory...');
  fs.mkdirSync(distCoreDir, { recursive: true });
  console.log('Dist/core directory created');
}

// Run TypeScript compiler
console.log('Running TypeScript compiler...');
try {
  // Use tsconfig.json with module format (declaration is now optional based on tsconfig.json)
  execSync('npx tsc --project tsconfig.json --module ES2020', { stdio: 'inherit' });
  console.log('TypeScript compilation complete');

  // Declaration files are now optional, so we don't need to restore them
  console.log('Skipping declaration file restoration as they are now optional');

  // Copy TypeScript files to dist directory (declaration files are optional)
  console.log('Copying TypeScript files to dist directory...');

  // Compile Recastra.ts to JavaScript
  const recastraSrc = path.join(__dirname, 'src', 'Recastra.ts');
  const recastraDest = path.join(distDir, 'Recastra.js');

  // Compile Recastra.ts to JavaScript
  // Create a temporary tsconfig for this file
  const tempTsConfigPath = path.join(__dirname, 'temp-tsconfig.json');
  const tsConfig = {
    compilerOptions: {
      target: "es2018",
      module: "ES2020",
      moduleResolution: "node",
      declaration: true,
      outDir: path.dirname(recastraDest),
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      lib: ["dom", "es2018"]
    },
    files: [recastraSrc],
    exclude: []
  };
  fs.writeFileSync(tempTsConfigPath, JSON.stringify(tsConfig, null, 2));

  // Compile using the temporary tsconfig
  execSync(`npx tsc --project ${tempTsConfigPath}`, { stdio: 'inherit' });
  console.log(`Compiled: ${recastraSrc} -> ${recastraDest}`);

  // Remove the temporary tsconfig
  fs.unlinkSync(tempTsConfigPath);

  // Generate declaration file for Recastra.ts
  console.log('Declaration file for Recastra.ts generated');

  // Core files are already compiled by the main TypeScript compilation
  console.log('Core files already compiled by the main TypeScript compilation');

  // Create index.js and index.d.ts
  console.log('Creating index.js and index.d.ts...');
  const indexJsPath = path.join(distDir, 'index.js');
  const indexJsContent = `export { Recastra } from './Recastra.js';`;
  fs.writeFileSync(indexJsPath, indexJsContent);

  const indexDtsPath = path.join(distDir, 'index.d.ts');
  const indexDtsContent = `export { Recastra, RecastraOptions } from './Recastra';`;
  fs.writeFileSync(indexDtsPath, indexDtsContent);

  console.log('Index files created');
} catch (error) {
  console.error('TypeScript compilation failed:', error);
  process.exit(1);
}

// Run the transform-modules script to transform CommonJS modules to ES modules
console.log('Running transform-modules script...');
try {
  execSync('node transform-modules.js', { stdio: 'inherit' });
  console.log('Module transformation complete');
} catch (error) {
  console.error('Module transformation failed:', error);
  process.exit(1);
}

// Minification step removed as Terser has been removed from the project
console.log('Skipping minification as Terser has been removed');
// Keep declaration files for Recastra.js and index.js
console.log('Keeping declaration files for Recastra.js and index.js');

console.log('Build process complete');
