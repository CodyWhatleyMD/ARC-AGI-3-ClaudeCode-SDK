import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = parseInt(process.env.PORT, 10) || 8080;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = createServer(async (req, res) => {
  try {
    // Default to index.html for root
    let filePath = req.url === '/' ? '/visualizer.html' : req.url;
    
    // Remove query parameters
    filePath = filePath.split('?')[0];
    
    // Security: prevent directory traversal
    if (filePath.includes('..')) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    // Security: never serve the API key
    if (filePath === '/config.json') {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    
    // Construct full path
    const fullPath = join(__dirname, filePath);
    
    // Read the file
    const content = await readFile(fullPath);
    
    // Set appropriate content type
    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    // Same-origin page; no CORS needed (a wildcard here would let any
    // website in the user's browser read these files cross-origin).
    res.writeHead(200, { 'Content-Type': contentType });
    
    res.end(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.writeHead(404);
      res.end('File not found');
    } else {
      console.error('Server error:', error);
      res.writeHead(500);
      res.end('Internal server error');
    }
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🎮 ARC AGI 3 Visualizer Server Running!`);
  console.log(`\n📍 Open in your browser:`);
  console.log(`   http://localhost:${PORT}\n`);
  console.log(`Press Ctrl+C to stop the server\n`);
});