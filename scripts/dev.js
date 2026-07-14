// scripts/dev.js
// Development server with watch mode

import fs from 'fs';
import path from 'path';
import http from 'http';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..');

// MIME types
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
};

// Build on start
console.log('🔨 Building initial bundle...');
exec('npm run build', (err) => {
  if (err) {
    console.error('❌ Build failed:', err);
    return;
  }
  console.log('✅ Initial build complete\n');
});

// Watch for changes and rebuild
let isBuilding = false;
let buildQueue = false;

function rebuild() {
  if (isBuilding) {
    buildQueue = true;
    return;
  }

  isBuilding = true;
  console.log('🔄 Rebuilding...');

  exec('npm run build', (err) => {
    isBuilding = false;
    if (err) {
      console.error('❌ Rebuild failed:', err.message);
    } else {
      console.log('✅ Rebuild complete');
    }

    if (buildQueue) {
      buildQueue = false;
      rebuild();
    }
  });
}

// Watch src directory for changes
function watchDirectory(dir) {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        watchDirectory(fullPath);
      } else if (file.endsWith('.js')) {
        fs.watch(fullPath, (eventType) => {
          if (eventType === 'change') {
            const relPath = path.relative(PUBLIC_DIR, fullPath);
            console.log(`📝 File changed: ${relPath}`);
            rebuild();
          }
        });
      }
    } catch (err) {
      // Ignore errors for files that might be deleted
    }
  }
}

// Start watching
console.log('👀 Watching for file changes...');
try {
  watchDirectory(path.join(PUBLIC_DIR, 'src'));
  console.log('✅ Watching src/ directory');
} catch (err) {
  console.error('❌ Failed to watch src:', err.message);
}

// Create HTTP server
const server = http.createServer((req, res) => {
  let filePath = req.url;

  // Handle root
  if (filePath === '/') {
    filePath = '/src/test/index.html';
  }

  // Build full path
  let fullPath = path.join(PUBLIC_DIR, filePath);

  // Check if file exists
  if (!fs.existsSync(fullPath)) {
    // Try adding .html
    const htmlPath = fullPath + '.html';
    if (fs.existsSync(htmlPath)) {
      fullPath = htmlPath;
    } else {
      // Try looking in examples
      const examplePath = path.join(PUBLIC_DIR, 'examples', filePath);
      if (fs.existsSync(examplePath)) {
        fullPath = examplePath;
      } else {
        res.writeHead(404);
        res.end(`404 Not Found: ${filePath}`);
        return;
      }
    }
  }

  // Get file extension
  const ext = path.extname(fullPath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  // Read and serve file
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end('500 Internal Server Error');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('\n Development server running!');
  console.log(` http://localhost:${PORT}`);
  console.log(`📁 Serving from: ${PUBLIC_DIR}`);
  console.log(` Test page: http://localhost:${PORT}/src/test/index.html`);
  console.log('\n🔧 Press Ctrl+C to stop\n');
});

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down server...');
  server.close(() => {
    console.log(' Server stopped');
    process.exit(0);
  });
});