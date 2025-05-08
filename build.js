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

// Backup any existing declaration files
console.log('Checking for existing declaration files...');
const declarationFiles = [];
function backupDeclarationFiles(dir) {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(file => {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        backupDeclarationFiles(fullPath);
      } else if (file.endsWith('.d.ts')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        declarationFiles.push({ path: fullPath, content });
        console.log(`Backed up declaration file: ${fullPath}`);
      }
    });
  }
}
backupDeclarationFiles(distDir);

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
  // Use tsconfig.json and explicitly set declaration flag and module format
  execSync('npx tsc --project tsconfig.json --declaration --module ES2020', { stdio: 'inherit' });
  console.log('TypeScript compilation complete');

  // Restore backed up declaration files
  console.log('Restoring declaration files...');
  declarationFiles.forEach(file => {
    // Ensure the directory exists
    const dir = path.dirname(file.path);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(file.path, file.content);
    console.log(`Restored declaration file: ${file.path}`);
  });

  // Generate declaration files and copy TypeScript files to dist directory
  console.log('Generating declaration files and copying TypeScript files...');

  // Generate declaration file for Recastra.ts
  const recastraSrc = path.join(__dirname, 'src', 'Recastra.ts');
  const recastraDest = path.join(distDir, 'Recastra.js');
  const recastraDts = path.join(distDir, 'Recastra.d.ts');

  // Compile Recastra.ts to JavaScript
  // Create a temporary tsconfig for this file
  const tempTsConfigPath = path.join(__dirname, 'temp-tsconfig.json');
  const tsConfig = {
    compilerOptions: {
      target: "es2018",
      module: "ES2020",
      moduleResolution: "node",
      declaration: false,
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
  execSync(`npx tsc ${recastraSrc} --declaration --emitDeclarationOnly --outFile ${recastraDts}`, { stdio: 'inherit' });
  console.log(`Generated declaration file: ${recastraDts}`);

  // Copy core files and generate declaration files
  const coreDir = path.join(__dirname, 'src', 'core');
  fs.readdirSync(coreDir).forEach(file => {
    if (file.endsWith('.ts') && !file.endsWith('.test.ts')) {
      const srcFile = path.join(coreDir, file);
      const destFile = path.join(distCoreDir, file.replace('.ts', '.js'));
      const dtsFile = path.join(distCoreDir, file.replace('.ts', '.d.ts'));

      // Compile TypeScript file to JavaScript
      // Create a temporary tsconfig for this file
      const tempCoreTsConfigPath = path.join(__dirname, `temp-tsconfig-${file.replace('.ts', '')}.json`);
      const coreTsConfig = {
        compilerOptions: {
          target: "es2018",
          module: "ES2020",
          moduleResolution: "node",
          declaration: false,
          outDir: distCoreDir,
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          lib: ["dom", "es2018"]
        },
        files: [srcFile],
        exclude: []
      };
      fs.writeFileSync(tempCoreTsConfigPath, JSON.stringify(coreTsConfig, null, 2));

      // Compile using the temporary tsconfig
      execSync(`npx tsc --project ${tempCoreTsConfigPath}`, { stdio: 'inherit' });
      console.log(`Compiled: ${srcFile} -> ${destFile}`);

      // Remove the temporary tsconfig
      fs.unlinkSync(tempCoreTsConfigPath);

      // Generate declaration file
      execSync(`npx tsc ${srcFile} --declaration --emitDeclarationOnly --outFile ${dtsFile}`, { stdio: 'inherit' });
      console.log(`Generated declaration file: ${dtsFile}`);
    }
  });

  // Create index.js and index.d.ts
  console.log('Creating index.js and index.d.ts...');
  const indexJsPath = path.join(distDir, 'index.js');
  const indexJsContent = `export { Recastra } from './Recastra.js';`;
  fs.writeFileSync(indexJsPath, indexJsContent);

  const indexDtsPath = path.join(distDir, 'index.d.ts');
  const indexDtsContent = `export { Recastra } from './Recastra';`;
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

// Run the minification script to minify the JavaScript files
console.log('Running minification script...');
try {
  execSync('node minify.js', { stdio: 'inherit' });
  console.log('Minification complete');
} catch (error) {
  console.error('Minification failed:', error);
  // Continue with the build process even if minification fails
  console.log('Continuing build process despite minification failure');
}
console.log('Build process complete');
