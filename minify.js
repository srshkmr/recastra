import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { minify } from 'terser';

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

// Minify all JavaScript files in the dist directory
async function minifyDistFiles() {
  const distDir = path.join(__dirname, 'dist');

  // Create dist directory if it doesn't exist
  if (!fs.existsSync(distDir)) {
    console.log('Creating dist directory...');
    fs.mkdirSync(distDir, { recursive: true });
    console.log('Dist directory created');
    return; // Exit early as there are no files to minify yet
  }

  const jsFiles = getJsFiles(distDir);

  console.log(`Found ${jsFiles.length} JavaScript files to minify`);

  for (const file of jsFiles) {
    try {
      const code = fs.readFileSync(file, 'utf8');
      const result = await minify(code, {
        compress: true,
        mangle: true,
        module: true
      });

      if (result.code) {
        fs.writeFileSync(file, result.code);
        console.log(`Minified: ${file}`);
      }
    } catch (err) {
      console.error(`Error minifying ${file}:`, err);
    }
  }

  console.log('Minification complete');
}

minifyDistFiles().catch(err => {
  console.error('Minification failed:', err);
  process.exit(1);
});
