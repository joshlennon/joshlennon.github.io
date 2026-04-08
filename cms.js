/**
 * Wix CMS Headless Integration
 * Site: Absolutely Perfect Catering & Events
 * Site ID: 0aac8a6e-1b2e-4682-b845-00a5490035f4
 * Collections: Properties (Venues), CityPages (Service Areas)
 */

const WIX_SITE_ID = '0aac8a6e-1b2e-4682-b845-00a5490035f4';
const WIX_API_KEY = 'IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0.eyJkYXRhIjoie1wiaWRcIjpcImRkZGRkODE0LWNmMjctNDM4Yi1iNDdkLTNjZDQyOTkxNjk0NlwiLFwiaWRlbnRpdHlcIjp7XCJ0eXBlXCI6XCJhcHBsaWNhdGlvblwiLFwiaWRcIjpcIjZhYjE5NmU4LTg1NjAtNGU3Ni1hYmE1LTFjMmFmOGRjNmY5YlwifSxcInRlbmFudFwiOntcInR5cGVcIjpcImFjY291bnRcIixcImlkXCI6XCJiM2VlNzVkNi00Y2E0LTQ5OGEtYTQwZC0xY2QyOWUzMjA4YmFcIn19IiwiaWF0IjoxNzc1NTg5MzMzfQ.h2mX5-ZPd5uCcj0HFrC3mpMwO-LLdIzPhEDH3zjEDO66mpPQ-t7c0cjhEowDjEPRiGD53qiruNpZGuo7Av-Nzwsae9k2KW0Zotk6gOPrCsgan7XgKqOrMJIwFbleyewezdrB-GxhUJFtemwbvTFjl43RWTfnj4oZT5GKmcUko7xFEx6tPmK9RVAx_CZwo0k6r5N9RVpxA8-2J4QtjcVKTBupefZ1bw_QNjaUI8a-LxVMvB7F08pWUHEEXe4ejm3Luvyp2SeUk_KS_j4ASnXew2JJLDfQAudo-PJDWoTIbNxRLX6xmsN0F_6Jz3ZtsfdcAOtSR2D6tFu-y3xM-hHqWQ';
const WIX_API_BASE = 'https://www.wixapis.com/wix-data/v2/items/query';

/**
 * Query any Wix CMS collection
 * @param {string} collectionId
 * @param {object} query - Wix Data query object
 */
async function queryWixCollection(collectionId, query = {}) {
  const response = await fetch(WIX_API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'wix-site-id': WIX_SITE_ID,
      'Authorization': WIX_API_KEY,
    },
    body: JSON.stringify({ dataCollectionId: collectionId, query }),
  });
  if (!response.ok) throw new Error(`Wix CMS ${collectionId}: ${response.status}`);
  const json = await response.json();
  return json.dataItems?.map(item => item.data) || [];
}

/**
 * Get venue by URL slug (derived from link-venues-title field)
 * CMS stores path as "/venues/{slug}" so we match on that field
 */
async function getVenueBySlug(slug) {
  const items = await queryWixCollection('Properties', {
    filter: { 'link-venues-title': { $eq: `/venues/${slug}` } },
    paging: { limit: 1 },
  });
  return items[0] || null;
}

/**
 * Get city page by slug field
 */
async function getCityBySlug(slug) {
  const items = await queryWixCollection('CityPages', {
    filter: { slug: { $eq: slug } },
    paging: { limit: 1 },
  });
  return items[0] || null;
}

/**
 * Get all venues in a county (for related venues on city pages)
 */
async function getVenuesByCounty(county) {
  return queryWixCollection('Properties', {
    filter: { county: { $eq: county } },
    sort: [{ fieldName: 'title', order: 'ASC' }],
    paging: { limit: 20 },
  });
}

/**
 * Extract plain text from Wix Rich Content nodes
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
 * Build a higher-resolution Wix static media URL
 */
function wixImageUrl(raw, w = 900, h = 600) {
  if (!raw) return `https://placehold.co/${w}x${h}/2A2420/C9A96E?text=Venue`;
  if (typeof raw === 'string' && raw.startsWith('http')) {
    // Swap Wix fill dimensions for higher quality
    return raw.replace(/\/fill\/w_\d+,h_\d+[^/]*\//, `/fill/w_${w},h_${h},al_c,q_85,usm_0.66_1.00_0.01,enc_auto/`);
  }
  return raw.url || `https://placehold.co/${w}x${h}/2A2420/C9A96E?text=Venue`;
}

/**
 * Extract slug from a Wix CMS link path
 * e.g. "/venues/american-visionary-arts-museum" → "american-visionary-arts-museum"
 */
function slugFromPath(path) {
  if (!path) return '';
  return path.split('/').filter(Boolean).pop() || '';
}

/**
 * Get slug from current page URL query string
 */
function getSlugFromURL() {
  return new URLSearchParams(window.location.search).get('slug') || '';
}
