// test-build.js
// Quick script to test if the library builds correctly

const fs = require('fs');
const path = require('path');

console.log('===> Testing dot.js build...\n');

// Check if dist directory exists
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  console.log('+++++ dist directory not found. Run "npm run build" first.');
  process.exit(1);
}

// Check required files
const requiredFiles = [
  'dotjs.js',
  'dotjs.min.js',
  'dotjs.esm.js',
  'dotjs.worker.js',
  'dotjs.worker.min.js',
];

let allExist = true;
for (const file of requiredFiles) {
  const filePath = path.join(distDir, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(` ${file} exists (${(stats.size / 1024).toFixed(2)} KB)`);
  } else {
    console.log(` ${file} missing`);
    allExist = false;
  }
}

if (allExist) {
  console.log('\n All required files exist! 🎉');
  console.log(' You can now use dot.js in your projects.');
  console.log(' Open src/test/index.html to run tests.');
} else {
  console.log('\n Some files are missing. Run "npm run build" to rebuild.');
  process.exit(1);
}