/**
 * cms.js — Wix CMS Data Layer (Static JSON Edition)
 *
 * Data is pre-fetched from Wix CMS and stored as static JSON files in /data/.
 * This avoids CORS issues and keeps the API key server-side.
 *
 * To refresh data from Wix CMS, run: node fetch-data.mjs
 * Then redeploy the updated data/ folder alongside the site files.
 *
 * Wix CMS Site ID: 0aac8a6e-1b2e-4682-b845-00a5490035f4
 * Collections:     Properties (Venues) · CityPages (Service Areas)
 */

// Cache loaded JSON so we only fetch each file once per page load
const _cache = {};

async function _loadJSON(file) {
  if (_cache[file]) return _cache[file];
  const res = await fetch(file);
  if (!res.ok) throw new Error(`Failed to load ${file}: ${res.status}`);
  _cache[file] = await res.json();
  return _cache[file];
}

/**
 * Return all venues from the pre-built static JSON.
 * Optionally filter by county string or pipe-separated county list.
 */
async function getVenues(county = null) {
  const all = await _loadJSON('data/venues.json');
  if (!county) return all;
  const counties = county.split('|');
  return all.filter(v => counties.includes(v.county));
}

/**
 * Return a single venue by its URL slug.
 * Slug is derived from the CMS field link-venues-title: "/venues/{slug}"
 */
async function getVenueBySlug(slug) {
  const all = await _loadJSON('data/venues.json');
  return all.find(v => slugFromPath(v['link-venues-title']) === slug) || null;
}

/**
 * Return venues in the same county (for related-venues panels).
 */
async function getVenuesByCounty(county) {
  const all = await _loadJSON('data/venues.json');
  return all.filter(v => v.county === county);
}

/**
 * Return all cities.
 * Optionally filter by pipe-separated region list.
 */
async function getCities(region = null) {
  const all = await _loadJSON('data/cities.json');
  if (!region) return all;
  const regions = region.split('|');
  return all.filter(c => regions.includes(c.region));
}

/**
 * Return a single city page by its slug field.
 */
async function getCityBySlug(slug) {
  const all = await _loadJSON('data/cities.json');
  return all.find(c => c.slug === slug) || null;
}

/**
 * Generic query helper — kept for compatibility but reads from static JSON.
 * Only supports simple equality filters on top-level fields.
 */
async function queryWixCollection(collectionId) {
  if (collectionId === 'Properties') return getVenues();
  if (collectionId === 'CityPages') return getCities();
  throw new Error(`Unknown collection: ${collectionId}`);
}

// ─── Utility functions ────────────────────────────────────────────────────────

/**
 * Extract plain text from Wix Rich Content node tree.
 */
function parseRichContent(rc) {
  if (!rc) return '';
  if (typeof rc === 'string') return rc;
  if (!rc.nodes) return '';
  return rc.nodes
    .map(node => {
      if (['PARAGRAPH', 'HEADING'].includes(node.type)) {
        return (node.nodes || []).map(t => t.textData?.text || '').join('');
      }
      return '';
    })
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Build a high-resolution Wix static media URL.
 * The image field from the CMS is a full wixstatic.com URL with fill params.
 */
function wixImageUrl(raw, w = 900, h = 600) {
  if (!raw) return `https://placehold.co/${w}x${h}/2A2420/C9A96E?text=Venue`;

  let url = '';
  if (typeof raw === 'string' && raw.startsWith('http')) {
    url = raw;
  } else if (raw && typeof raw === 'object') {
    url = raw.url || '';
  }
  if (!url) return `https://placehold.co/${w}x${h}/2A2420/C9A96E?text=Venue`;

  // Replace existing fill dimensions with requested size
  if (url.includes('/fill/')) {
    return url.replace(/\/fill\/[^/]+\//, `/fill/w_${w},h_${h},al_c,q_85,usm_0.66_1.00_0.01,enc_auto/`);
  }
  // Append fill params if not already present
  return url.replace(/\/v1\/([^/]+)\//, `/v1/$1/fill/w_${w},h_${h},al_c,q_85,enc_auto/`);
}

/**
 * Extract the last path segment as a slug.
 * e.g. "/venues/some-place" → "some-place"
 */
function slugFromPath(p) {
  if (!p) return '';
  return p.split('/').filter(Boolean).pop() || '';
}

/**
 * Read the ?slug= query param from the current page URL.
 */
function getSlugFromURL() {
  return new URLSearchParams(window.location.search).get('slug') || '';
}
