const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const rootDir = __dirname;
const port = Number(process.env.PORT || 9000);
const host = '127.0.0.1';

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8'
};

const cacheControl = {
  html: 'no-cache, no-store, must-revalidate',
  css: 'public, max-age=31536000, immutable',
  js: 'public, max-age=31536000, immutable',
  json: 'public, max-age=86400',
  image: 'public, max-age=86400',
  font: 'public, max-age=31536000, immutable',
  default: 'public, max-age=86400'
};

function getCacheHeader(extension) {
  switch (extension) {
    case '.html':
      return cacheControl.html;
    case '.css':
      return cacheControl.css;
    case '.js':
      return cacheControl.js;
    case '.json':
      return cacheControl.json;
    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.gif':
    case '.svg':
    case '.webp':
      return cacheControl.image;
    case '.woff':
    case '.woff2':
    case '.ttf':
      return cacheControl.font;
    default:
      return cacheControl.default;
  }
}

function sendFile(filePath, response, requestHeaders = {}) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  const acceptEncoding = requestHeaders['accept-encoding'] || '';

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Internal Server Error');
      return;
    }

    const cacheHeaders = {
      'Cache-Control': getCacheHeader(ext),
      'Content-Type': contentType
    };

    if (acceptEncoding.includes('gzip') && ['.html', '.css', '.js', '.json', '.svg', '.txt'].includes(ext)) {
      response.writeHead(200, {
        ...cacheHeaders,
        'Content-Encoding': 'gzip',
        'Vary': 'Accept-Encoding'
      });
      response.end(zlib.gzipSync(data));
      return;
    }

    if (acceptEncoding.includes('br') && ['.html', '.css', '.js', '.json', '.svg', '.txt'].includes(ext)) {
      response.writeHead(200, {
        ...cacheHeaders,
        'Content-Encoding': 'br',
        'Vary': 'Accept-Encoding'
      });
      response.end(zlib.brotliCompressSync(data));
      return;
    }

    response.writeHead(200, cacheHeaders);
    response.end(data);
  });
}

const server = http.createServer((request, response) => {
  const requestPath = decodeURIComponent((request.url || '/').split('?')[0]);
  const safePath = path.normalize(requestPath).replace(/^([.][.][/\\])+/, '');
  const relativePath = safePath === '/' ? 'index.html' : safePath.replace(/^[/\\]/, '');
  const filePath = path.join(rootDir, relativePath);

  if (!filePath.startsWith(rootDir)) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  fs.stat(filePath, (error, stats) => {
    if (error) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not Found');
      return;
    }

    if (stats.isDirectory()) {
      const indexPath = path.join(filePath, 'index.html');
      fs.stat(indexPath, (indexError, indexStats) => {
        if (indexError || !indexStats.isFile()) {
          response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          response.end('Not Found');
          return;
        }

        sendFile(indexPath, response, request.headers);
      });
      return;
    }

    if (!stats.isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not Found');
      return;
    }

    sendFile(filePath, response, request.headers);
  });
});

server.listen(port, host, () => {
  console.log(`QLTS web is running at http://${host}:${port}`);
});