/**
 * fetch-data.mjs
 * Run this whenever you want to refresh CMS data from Wix:
 *   node fetch-data.mjs
 *
 * Writes static JSON snapshots to ./data/ which the site reads
 * client-side (no CORS, no API key exposed in browser).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const WIX_SITE_ID = '0aac8a6e-1b2e-4682-b845-00a5490035f4';
const WIX_API_KEY = 'IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0.eyJkYXRhIjoie1wiaWRcIjpcImRkZGRkODE0LWNmMjctNDM4Yi1iNDdkLTNjZDQyOTkxNjk0NlwiLFwiaWRlbnRpdHlcIjp7XCJ0eXBlXCI6XCJhcHBsaWNhdGlvblwiLFwiaWRcIjpcIjZhYjE5NmU4LTg1NjAtNGU3Ni1hYmE1LTFjMmFmOGRjNmY5YlwifSxcInRlbmFudFwiOntcInR5cGVcIjpcImFjY291bnRcIixcImlkXCI6XCJiM2VlNzVkNi00Y2E0LTQ5OGEtYTQwZC0xY2QyOWUzMjA4YmFcIn19IiwiaWF0IjoxNzc1NTg5MzMzfQ.h2mX5-ZPd5uCcj0HFrC3mpMwO-LLdIzPhEDH3zjEDO66mpPQ-t7c0cjhEowDjEPRiGD53qiruNpZGuo7Av-Nzwsae9k2KW0Zotk6gOPrCsgan7XgKqOrMJIwFbleyewezdrB-GxhUJFtemwbvTFjl43RWTfnj4oZT5GKmcUko7xFEx6tPmK9RVAx_CZwo0k6r5N9RVpxA8-2J4QtjcVKTBupefZ1bw_QNjaUI8a-LxVMvB7F08pWUHEEXe4ejm3Luvyp2SeUk_KS_j4ASnXew2JJLDfQAudo-PJDWoTIbNxRLX6xmsN0F_6Jz3ZtsfdcAOtSR2D6tFu-y3xM-hHqWQ';
const API_BASE = 'https://www.wixapis.com/wix-data/v2/items/query';

async function queryAll(collectionId, sortField = 'title') {
  let all = [];
  let cursor = null;

  do {
    const body = {
      dataCollectionId: collectionId,
      query: {
        sort: [{ fieldName: sortField, order: 'ASC' }],
        cursorPaging: { limit: 100, ...(cursor ? { cursor } : {}) },
      },
    };

    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'wix-site-id': WIX_SITE_ID,
        'Authorization': WIX_API_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${collectionId} ${res.status}: ${text}`);
    }

    const json = await res.json();
    const items = (json.dataItems || []).map(i => i.data);
    all.push(...items);

    cursor = json.pagingMetadata?.cursors?.next || null;
    const hasNext = json.pagingMetadata?.hasNext;
    if (!hasNext) break;
  } while (cursor);

  return all;
}

async function run() {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

  console.log('Fetching venues (Properties collection)...');
  const venues = await queryAll('Properties', 'title');
  const venuesOut = path.join(dataDir, 'venues.json');
  fs.writeFileSync(venuesOut, JSON.stringify(venues, null, 2));
  console.log(`  ✓ ${venues.length} venues → data/venues.json`);

  console.log('Fetching service areas (CityPages collection)...');
  const cities = await queryAll('CityPages', 'title');
  const citiesOut = path.join(dataDir, 'cities.json');
  fs.writeFileSync(citiesOut, JSON.stringify(cities, null, 2));
  console.log(`  ✓ ${cities.length} cities → data/cities.json`);

  // Write a manifest with fetch timestamp
  const manifest = {
    fetchedAt: new Date().toISOString(),
    venueCount: venues.length,
    cityCount: cities.length,
  };
  fs.writeFileSync(path.join(dataDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('\n  Done. Upload the data/ folder with your site files.');
  console.log('  Re-run this script any time you update content in Wix CMS.\n');
}

run().catch(err => { console.error('Error:', err.message); process.exit(1); });
