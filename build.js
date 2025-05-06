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
}

// Run TypeScript compiler
console.log('Running TypeScript compiler...');
try {
  // Use direct compilation with explicit file paths
  execSync('npx tsc src/index.ts src/Recastra.ts --outDir dist', { stdio: 'inherit' });
  console.log('TypeScript compilation complete');
} catch (error) {
  console.error('TypeScript compilation failed:', error);
  process.exit(1);
}

// Run minify script
console.log('Running minification...');
try {
  execSync('node minify.js', { stdio: 'inherit' });
  console.log('Build process complete');
} catch (error) {
  console.error('Minification failed:', error);
  process.exit(1);
}
