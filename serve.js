const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const net = require('net');
const { execFile } = require('child_process');

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
  css: 'no-cache, no-store, must-revalidate',
  js: 'no-cache, no-store, must-revalidate',
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

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) {
        request.destroy();
        reject(new Error('Payload too large'));
      }
    });
    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    request.on('error', reject);
  });
}

function checkTcpPort(host, port, timeoutMs = 2500) {
  return new Promise((resolve) => {
    const startTime = process.hrtime.bigint();
    const socket = new net.Socket();
    let isResolved = false;

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      if (isResolved) return;
      isResolved = true;
      const elapsedNs = process.hrtime.bigint() - startTime;
      const latencyMs = Math.max(1, Math.round(Number(elapsedNs) / 1e6));
      socket.destroy();
      resolve({
        ok: true,
        status: 'Online',
        latency_ms: latencyMs,
        detail: `Cổng ${port} mở (TCP Connect OK)`,
        error: null
      });
    });

    socket.on('timeout', () => {
      if (isResolved) return;
      isResolved = true;
      socket.destroy();
      resolve({
        ok: false,
        status: 'Offline',
        latency_ms: timeoutMs,
        detail: `Hết thời gian chờ kết nối cổng ${port} (${timeoutMs}ms)`,
        error: 'ETIMEDOUT'
      });
    });

    socket.on('error', (err) => {
      if (isResolved) return;
      isResolved = true;
      const elapsedNs = process.hrtime.bigint() - startTime;
      const latencyMs = Math.max(1, Math.round(Number(elapsedNs) / 1e6));
      socket.destroy();
      const code = err.code || err.message;
      let detail = `Lỗi kết nối cổng ${port}: ${code}`;
      if (code === 'ECONNREFUSED') detail = `Cổng ${port} bị từ chối kết nối (Port Closed / Refused)`;
      if (code === 'ENOTFOUND') detail = `Không thể phân giải tên miền (DNS Host Not Found)`;
      if (code === 'EHOSTUNREACH') detail = `Host không thể truy cập (Host Unreachable)`;
      resolve({
        ok: false,
        status: 'Offline',
        latency_ms: latencyMs,
        detail: detail,
        error: code
      });
    });

    try {
      socket.connect(port, host);
    } catch (err) {
      if (!isResolved) {
        isResolved = true;
        resolve({
          ok: false,
          status: 'Offline',
          latency_ms: 0,
          detail: err.message,
          error: err.code || 'ERROR'
        });
      }
    }
  });
}

function checkIcmpPing(host, timeoutMs = 2500) {
  return new Promise((resolve) => {
    // Sanitize host: allow only standard IPv4, IPv6, or domain/hostname
    if (!/^[a-zA-Z0-9.\-:]+$/.test(host)) {
      return resolve({
        ok: false,
        status: 'Offline',
        latency_ms: 0,
        detail: 'Địa chỉ IP hoặc tên miền chứa ký tự không hợp lệ',
        error: 'INVALID_HOST'
      });
    }

    const isWin = process.platform === 'win32';
    const pingCmd = 'ping';
    const pingArgs = isWin 
      ? ['-n', '1', '-w', String(timeoutMs), host]
      : ['-c', '1', '-W', String(Math.ceil(timeoutMs / 1000)), host];

    const startTime = process.hrtime.bigint();

    execFile(pingCmd, pingArgs, { timeout: timeoutMs + 1000 }, (err, stdout, stderr) => {
      const elapsedNs = process.hrtime.bigint() - startTime;
      const realLatencyMs = Math.max(1, Math.round(Number(elapsedNs) / 1e6));

      const output = (stdout || '') + (stderr || '');
      
      const timeMatch = output.match(/time[=<](\d+(?:\.\d+)?)ms/i);
      const isReply = isWin 
        ? (output.includes('Reply from') || output.includes('phản hồi từ')) && !output.includes('Destination host unreachable') && !output.includes('Request timed out')
        : output.includes('1 packets transmitted, 1 received') || output.includes('1 received');

      if (timeMatch || isReply) {
        const pingTime = timeMatch ? Math.max(1, Math.round(parseFloat(timeMatch[1]))) : realLatencyMs;
        return resolve({
          ok: true,
          status: 'Online',
          latency_ms: pingTime,
          detail: `Phản hồi ICMP Ping thành công (${pingTime}ms)`,
          error: null
        });
      }

      let errorDetail = 'Không có phản hồi ICMP (Request timed out)';
      if (output.includes('Destination host unreachable')) {
        errorDetail = 'Không tìm thấy đường tới host (Host unreachable)';
      } else if (output.includes('could not find host') || output.includes('not found')) {
        errorDetail = 'Không phân giải được tên miền (Host not found)';
      }

      resolve({
        ok: false,
        status: 'Offline',
        latency_ms: timeoutMs,
        detail: errorDetail,
        error: 'TIMED_OUT'
      });
    });
  });
}

const server = http.createServer((request, response) => {
  const requestUrl = request.url || '/';
  const requestPath = decodeURIComponent(requestUrl.split('?')[0]);

  // ============================================================
  // API Network Monitoring & Ping Endpoints
  // ============================================================
  if (requestPath.startsWith('/api/network/')) {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }

    // Health check endpoint for Agent
    if (requestPath === '/api/network/agent-status' && request.method === 'GET') {
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({
        ok: true,
        version: '2.0.0',
        platform: process.platform,
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString()
      }));
      return;
    }

    // Single Target Ping/Check
    if (requestPath === '/api/network/ping' && request.method === 'POST') {
      readJsonBody(request).then(async (data) => {
        const { host, port, timeout_ms } = data;
        if (!host) {
          response.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          return response.end(JSON.stringify({ ok: false, error: 'Host is required' }));
        }

        const cleanHost = host.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0];
        const timeout = Math.min(Math.max(Number(timeout_ms) || 2500, 500), 5000);
        let result;
        if (port && Number(port) > 0 && Number(port) <= 65535) {
          result = await checkTcpPort(cleanHost, Number(port), timeout);
        } else {
          result = await checkIcmpPing(cleanHost, timeout);
        }

        response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify({
          ...result,
          host: cleanHost,
          port: port ? Number(port) : null,
          timestamp: new Date().toISOString()
        }));
      }).catch(err => {
        response.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify({ ok: false, error: err.message }));
      });
      return;
    }

    // Batch Ping / Ping-all
    if (requestPath === '/api/network/ping-all' && request.method === 'POST') {
      readJsonBody(request).then(async (data) => {
        const targets = Array.isArray(data.targets) ? data.targets : [];
        const timeout = Math.min(Math.max(Number(data.timeout_ms) || 2500, 500), 5000);
        
        const results = [];
        const chunkSize = 5;
        for (let i = 0; i < targets.length; i += chunkSize) {
          const chunk = targets.slice(i, i + chunkSize);
          const chunkResults = await Promise.all(chunk.map(async (t) => {
            const rawHost = t.address || t.host;
            if (!rawHost) return { id: t.id, ok: false, status: 'Offline', error: 'Missing host' };
            const cleanHost = rawHost.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0];
            const p = t.port ? Number(t.port) : null;
            
            let res;
            if (p && p > 0 && p <= 65535) {
              res = await checkTcpPort(cleanHost, p, timeout);
            } else {
              res = await checkIcmpPing(cleanHost, timeout);
            }
            return {
              id: t.id,
              ...res,
              host: cleanHost,
              port: p,
              timestamp: new Date().toISOString()
            };
          }));
          results.push(...chunkResults);
        }

        response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify({ ok: true, count: results.length, results }));
      }).catch(err => {
        response.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify({ ok: false, error: err.message }));
      });
      return;
    }

    response.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ ok: false, error: 'Endpoint not found' }));
    return;
  }

  // ============================================================
  // Static File Serving
  // ============================================================
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
  console.log(`QLTS web & Network Monitoring Agent is running at http://${host}:${port}`);
});