import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to recursively get all .js files in a directory
function getJsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);

  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      // Recursively search directories
      results = results.concat(getJsFiles(filePath));
    } else if (path.extname(file) === '.js') {
      // Add .js files to the results
      results.push(filePath);
    }
  });

  return results;
}

// Transform CommonJS modules to ES modules
async function transformModules() {
  const distDir = path.join(__dirname, 'dist');

  // Create dist directory if it doesn't exist
  if (!fs.existsSync(distDir)) {
    console.log('Creating dist directory...');
    fs.mkdirSync(distDir, { recursive: true });
    console.log('Dist directory created');
    return; // Exit early as there are no files to transform yet
  }

  const jsFiles = getJsFiles(distDir);

  console.log(`Found ${jsFiles.length} JavaScript files to transform`);

  // Transform the files
  for (const file of jsFiles) {
    try {
      // Special case for index.js - we know exactly what it should export
      if (file.endsWith('index.js')) {
        const code = `export { Recastra } from './Recastra.js';`;
        fs.writeFileSync(file, code);
        console.log(`Transformed: ${file}`);
        continue;
      }
      
      // For other files, we need to do a more complex transformation
      // Read the original file
      const originalCode = fs.readFileSync(file, 'utf8');
      
      // Extract the filename without extension and directory
      const fileName = path.basename(file, '.js');
      
      // Create a new ES module version of the file
      let esModuleCode = '';
      
      // Add imports
      const importMatches = originalCode.match(/(?:const|var)\s+(\w+)(?:_\d+)?\s*=\s*require\(['"](.+)['"]\)/g) || [];
      const imports = importMatches.map(match => {
        const [, varName, modulePath] = match.match(/(?:const|var)\s+(\w+(?:_\d+)?)\s*=\s*require\(['"](.+)['"]\)/) || [];
        if (varName && modulePath) {
          // Add .js extension to relative imports
          const importPath = modulePath.startsWith('.') ? `${modulePath}.js` : modulePath;
          return `import ${varName} from '${importPath}';`;
        }
        return '';
      });
      
      if (imports.length > 0) {
        esModuleCode += imports.join('\n') + '\n\n';
      }
      
      // Add the rest of the code, but remove CommonJS specific parts
      let codeBody = originalCode;
      
      // Remove "use strict" and Object.defineProperty for __esModule
      codeBody = codeBody.replace(/"use strict";/g, '');
      codeBody = codeBody.replace(/Object\.defineProperty\(exports,\s*"__esModule",\s*\{\s*value:\s*(?:true|!0)\s*\}\);?/g, '');
      
      // Remove require statements as we've already handled them
      codeBody = codeBody.replace(/(?:const|var)\s+(\w+)(?:_\d+)?\s*=\s*require\(['"](.+)['"]\);?/g, '');
      
      // Replace exports.X with export const X
      codeBody = codeBody.replace(/exports\.(\w+)\s*=\s*(.+?);/g, 'export const $1 = $2;');
      
      // Replace module.exports with export default
      codeBody = codeBody.replace(/module\.exports\s*=\s*(.+?);/g, 'export default $1;');
      
      // Handle special case for class exports
      if (codeBody.includes(`exports.${fileName}=`) || codeBody.includes(`exports.${fileName} =`)) {
        const classRegex = new RegExp(`exports\\.${fileName}\\s*=\\s*(.+?);`, 'g');
        codeBody = codeBody.replace(classRegex, `export { $1 as ${fileName} };`);
      }
      
      // Add the modified code body
      esModuleCode += codeBody;
      
      // Write the transformed file
      fs.writeFileSync(file, esModuleCode);
      console.log(`Transformed: ${file}`);
    } catch (err) {
      console.error(`Error transforming ${file}:`, err);
    }
  }

  console.log('Module transformation complete');
}

transformModules().catch(err => {
  console.error('Module transformation failed:', err);
  process.exit(1);
});