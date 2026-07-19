const http = require('http');
const httpProxy = require('http-proxy');

// This script wraps the Metro dev server with Cross-Origin headers
// required for SharedArrayBuffer (used by expo-sqlite on web).
//
// Usage: node serve-web.js
// Then open http://localhost:3000 in your browser.

const METRO_PORT = 8081;
const PROXY_PORT = 3000;

const proxy = httpProxy.createProxyServer({
  target: `http://localhost:${METRO_PORT}`,
  ws: true,
});

const server = http.createServer((req, res) => {
  // Add COOP/COEP headers required for SharedArrayBuffer
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

  proxy.web(req, res, {}, (err) => {
    console.error('Proxy error:', err.message);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Metro bundler is not running. Start it first with: npx expo start --web');
  });
});

server.on('upgrade', (req, socket, head) => {
  proxy.ws(req, socket, head);
});

server.listen(PROXY_PORT, () => {
  console.log(`\n✅ SpendFlow Web Proxy running at: http://localhost:${PROXY_PORT}`);
  console.log(`   Proxying to Metro at: http://localhost:${METRO_PORT}`);
  console.log(`   SharedArrayBuffer headers enabled (COOP + COEP)\n`);
});
