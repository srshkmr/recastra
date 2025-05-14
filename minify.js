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

// Format file size in a human-readable format
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
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

  let totalOriginalSize = 0;
  let totalMinifiedSize = 0;

  for (const file of jsFiles) {
    try {
      const code = fs.readFileSync(file, 'utf8');
      const originalSize = Buffer.byteLength(code, 'utf8');
      totalOriginalSize += originalSize;

      // Advanced Terser options for better minification
      const result = await minify(code, {
        compress: {
          arrows: true,
          arguments: true,
          booleans_as_integers: true,
          booleans: true,
          collapse_vars: true,
          comparisons: true,
          computed_props: true,
          conditionals: true,
          dead_code: true,
          directives: true,
          drop_console: false, // Keep console for debugging
          drop_debugger: true,
          ecma: 2020,
          evaluate: true,
          expression: true,
          hoist_funs: true,
          hoist_props: true,
          hoist_vars: false,
          if_return: true,
          inline: true,
          join_vars: true,
          keep_classnames: false,
          keep_fargs: true,
          keep_fnames: false,
          keep_infinity: true,
          loops: true,
          module: true,
          negate_iife: true,
          passes: 2,
          properties: true,
          pure_getters: true,
          reduce_vars: true,
          sequences: true,
          side_effects: true,
          switches: true,
          toplevel: true,
          typeofs: true,
          unused: true
        },
        mangle: {
          properties: {
            regex: /^_/  // Only mangle properties that start with underscore
          },
          module: true,
          toplevel: true
        },
        module: true,
        toplevel: true,
        format: {
          comments: false,
          ecma: 2020
        }
      });

      if (result.code) {
        fs.writeFileSync(file, result.code);
        const minifiedSize = Buffer.byteLength(result.code, 'utf8');
        totalMinifiedSize += minifiedSize;
        const reduction = ((originalSize - minifiedSize) / originalSize * 100).toFixed(2);
        console.log(`Minified: ${file} (${formatBytes(originalSize)} → ${formatBytes(minifiedSize)}, ${reduction}% reduction)`);
      }
    } catch (err) {
      console.error(`Error minifying ${file}:`, err);
    }
  }

  if (totalOriginalSize > 0) {
    const totalReduction = ((totalOriginalSize - totalMinifiedSize) / totalOriginalSize * 100).toFixed(2);
    console.log(`\nTotal size reduction: ${formatBytes(totalOriginalSize)} → ${formatBytes(totalMinifiedSize)} (${totalReduction}% reduction)`);
  }

  console.log('Minification complete');
}

minifyDistFiles().catch(err => {
  console.error('Minification failed:', err);
  process.exit(1);
});
