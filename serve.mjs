import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
};

/**
 * Route table
 * Maps clean URL patterns → HTML template file
 * Query params (e.g. ?slug=...) are preserved and passed through to the template.
 *
 * Examples:
 *   /venues                  → venues.html
 *   /venues/gramercy-mansion → venue.html?slug=gramercy-mansion
 *   /areas                   → areas.html
 *   /areas/baltimore         → area.html?slug=baltimore
 */
function resolveRoute(urlPath, urlSearch) {
  // Strip trailing slash
  const clean = urlPath.endsWith('/') && urlPath !== '/' ? urlPath.slice(0, -1) : urlPath;

  // Exact routes
  const exactRoutes = {
    '/': 'index.html',
    '/index': 'index.html',
    '/venues': 'venues.html',
    '/areas': 'areas.html',
    '/area': 'area.html',
    '/venue': 'venue.html',
  };
  if (exactRoutes[clean]) return { file: exactRoutes[clean], search: urlSearch };

  // /venues/:slug  → venue.html?slug=:slug
  const venueMatch = clean.match(/^\/venues\/(.+)$/);
  if (venueMatch) return { file: 'venue.html', search: `?slug=${venueMatch[1]}` };

  // /areas/:slug  → area.html?slug=:slug
  // Also /cities/:slug for Wix CMS link-city-pages-title format
  const areaMatch = clean.match(/^\/(?:areas|cities)\/(.+)$/);
  if (areaMatch) return { file: 'area.html', search: `?slug=${areaMatch[1]}` };

  return null;
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  let urlPath = parsedUrl.pathname;
  const urlSearch = parsedUrl.search;

  // Try clean URL routing first
  const route = resolveRoute(urlPath, urlSearch);
  if (route) {
    const filePath = path.join(__dirname, route.file);
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
    return;
  }

  // Fallback: serve static files directly
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(__dirname, urlPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n  Absolutely Perfect Catering — Dev Server`);
  console.log(`  ─────────────────────────────────────────`);
  console.log(`  http://localhost:${PORT}           → Home`);
  console.log(`  http://localhost:${PORT}/venues    → All Venues`);
  console.log(`  http://localhost:${PORT}/venues/:slug → Venue Detail`);
  console.log(`  http://localhost:${PORT}/areas     → All Service Areas`);
  console.log(`  http://localhost:${PORT}/areas/:slug  → Area Detail`);
  console.log(`  ─────────────────────────────────────────\n`);
});
