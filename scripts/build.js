// scripts/build.js
// Production build script for dot.js

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔨 Building dot.js...\n');

// Ensure dist directory exists
const distDir = path.join(__dirname, '../dist');
if (!fs.existsSync(distDir)) {
  console.log('📁 Creating dist directory...');
  fs.mkdirSync(distDir, { recursive: true });
}

// Clean dist directory
console.log('🧹 Cleaning dist directory...');
const files = fs.readdirSync(distDir);
for (const file of files) {
  const filePath = path.join(distDir, file);
  if (fs.statSync(filePath).isFile()) {
    fs.unlinkSync(filePath);
  }
}
console.log('✅ Clean complete\n');

// Run rollup build
console.log('📦 Bundling with Rollup...');
try {
  execSync('npx rollup -c', {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' },
  });
  console.log('✅ Rollup build complete\n');
} catch (err) {
  console.error('❌ Rollup build failed:', err.message);
  process.exit(1);
}

// Generate size report
console.log('📊 Generating size report...\n');
try {
  const distFiles = fs.readdirSync(distDir);
  let totalSize = 0;
  const fileSizes = [];

  console.log('📦 Build Output:');
  console.log('─'.repeat(50));

  for (const file of distFiles) {
    const filePath = path.join(distDir, file);
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    totalSize += stats.size;

    const sizeStr = sizeMB > 1 ? `${sizeMB} MB` : `${sizeKB} KB`;
    fileSizes.push({ file, size: stats.size, sizeStr });

    // Add icon based on file type
    let icon = '📄';
    if (file.includes('worker')) icon = '🧠';
    if (file.includes('min')) icon = '⚡';
    if (file.includes('esm')) icon = '📦';

    console.log(`  ${icon} ${file.padEnd(25)} ${sizeStr.padStart(10)}`);
  }

  console.log('─'.repeat(50));
  const totalKB = (totalSize / 1024).toFixed(2);
  const totalMB = (totalSize / (1024 * 1024)).toFixed(2);
  const totalStr = totalMB > 1 ? `${totalMB} MB` : `${totalKB} KB`;
  console.log(`  📊 Total: ${' '.repeat(25)} ${totalStr.padStart(10)}`);
  console.log('─'.repeat(50));

  // Save size report
  const reportPath = path.join(distDir, 'size-report.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        files: fileSizes,
        total: totalSize,
        totalStr,
      },
      null,
      2,
    ),
  );
  console.log(`\n📊 Size report saved to: ${reportPath}`);
} catch (err) {
  console.error('❌ Failed to generate size report:', err.message);
}

console.log('\n✅ Build complete! 🎉');
console.log('📂 Output directory: dist/');
console.log('💡 To test: open src/test/index.html in your browser\n');