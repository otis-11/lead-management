require('dotenv').config();

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const { sleep, rowKey } = require('./src/utils');
const { loadCheckpoint, saveCheckpoint } = require('./src/checkpoint');
const { lookupGooglePlaces } = require('./src/googlePlaces');
const { scrapeWebsite } = require('./src/scrapeWebsite');
const { hunterEmailSearch } = require('./src/hunter');
const { apolloOwnerSearch } = require('./src/apollo');
const { writeOutputs } = require('./src/output');

const INPUT_CSV = path.join(__dirname, 'businesses.csv');
const CHECKPOINT_INTERVAL = 50;
const DELAY_MS = 500;

/**
 * Read all rows from businesses.csv.
 */
function readInputCsv() {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(INPUT_CSV)
      .pipe(csv())
      .on('data', (row) => {
        rows.push({
          category: (row.category || '').trim(),
          business_name: (row.business_name || '').trim(),
          phone: (row.phone || '').trim(),
        });
      })
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

/**
 * Run the full enrichment pipeline for a single business row.
 */
async function enrichBusiness(row) {
  const enriched = {
    category: row.category,
    business_name: row.business_name,
    phone: row.phone,
    owner_name: '',
    email: '',
    website_url: '',
    address: '',
    google_rating: '',
    review_count: '',
    website_modern: 'none',
    enrichment_notes: '',
  };

  const notes = [];

  // ── Step 1: Google Places ──
  try {
    console.log(`  [1/4] Google Places lookup...`);
    const gp = await lookupGooglePlaces(row.business_name, row.phone);
    if (gp.address) enriched.address = gp.address;
    if (gp.website_url) enriched.website_url = gp.website_url;
    if (gp.google_rating) enriched.google_rating = gp.google_rating;
    if (gp.review_count) enriched.review_count = gp.review_count;
    if (gp._notes) notes.push(gp._notes);
  } catch (err) {
    console.error(`  [1/4] Google Places error: ${err.message}`);
    notes.push(`Google error: ${err.message}`);
  }

  // ── Step 2: Website Scraping ──
  try {
    console.log(`  [2/4] Website scraping...`);
    const ws = await scrapeWebsite(enriched.website_url);
    if (ws.email) enriched.email = ws.email;
    if (ws.owner_name) enriched.owner_name = ws.owner_name;
    enriched.website_modern = ws.website_modern || 'none';
    if (ws._notes) notes.push(ws._notes);
  } catch (err) {
    console.error(`  [2/4] Scraping error: ${err.message}`);
    notes.push(`Scrape error: ${err.message}`);
  }

  // ── Step 3: Hunter.io (email gap-fill) ──
  if (!enriched.email && enriched.website_url) {
    try {
      console.log(`  [3/4] Hunter.io email search...`);
      const h = await hunterEmailSearch(enriched.website_url);
      if (h.email) enriched.email = h.email;
      if (h._notes) notes.push(h._notes);
    } catch (err) {
      console.error(`  [3/4] Hunter error: ${err.message}`);
      notes.push(`Hunter error: ${err.message}`);
    }
  } else {
    console.log(`  [3/4] Hunter.io skipped (${enriched.email ? 'email already found' : 'no website'})`);
  }

  // ── Step 4: Apollo.io (owner name gap-fill) ──
  if (!enriched.owner_name) {
    try {
      console.log(`  [4/4] Apollo.io owner search...`);
      const a = await apolloOwnerSearch(row.business_name);
      if (a.owner_name) enriched.owner_name = a.owner_name;
      if (a._notes) notes.push(a._notes);
    } catch (err) {
      console.error(`  [4/4] Apollo error: ${err.message}`);
      notes.push(`Apollo error: ${err.message}`);
    }
  } else {
    console.log(`  [4/4] Apollo.io skipped (owner already found)`);
  }

  enriched.enrichment_notes = notes.join(' | ');
  return enriched;
}

/**
 * Main entry point.
 */
async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  Business Enrichment Pipeline');
  console.log('═══════════════════════════════════════════');

  // Read input
  const rows = await readInputCsv();
  console.log(`\nLoaded ${rows.length} businesses from ${INPUT_CSV}`);

  // Load checkpoint
  const checkpoint = loadCheckpoint();
  console.log(`Checkpoint: ${checkpoint.processedKeys.size} already processed\n`);

  const processedKeys = checkpoint.processedKeys;
  const results = [...checkpoint.results];
  let newCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const key = rowKey(row);

    // Skip if already processed
    if (processedKeys.has(key)) {
      continue;
    }

    console.log(`\n[${i + 1}/${rows.length}] ${row.category} — ${row.business_name}`);

    const enriched = await enrichBusiness(row);
    results.push(enriched);
    processedKeys.add(key);
    newCount++;

    // Checkpoint every N records
    if (newCount % CHECKPOINT_INTERVAL === 0) {
      saveCheckpoint(processedKeys, results);
    }

    // Rate limiting delay
    await sleep(DELAY_MS);
  }

  // Final checkpoint
  if (newCount > 0) {
    saveCheckpoint(processedKeys, results);
  }

  console.log(`\n═══════════════════════════════════════════`);
  console.log(`  Enrichment complete: ${newCount} new, ${results.length} total`);
  console.log(`═══════════════════════════════════════════\n`);

  // Sort results to preserve original input order (by category grouping, then input position)
  const inputOrder = new Map();
  rows.forEach((r, idx) => inputOrder.set(rowKey(r), idx));
  results.sort((a, b) => {
    const orderA = inputOrder.get(rowKey(a)) ?? 9999;
    const orderB = inputOrder.get(rowKey(b)) ?? 9999;
    return orderA - orderB;
  });

  // Write outputs
  await writeOutputs(results);

  console.log('\nDone! Output files:');
  console.log('  - enriched_businesses.csv');
  console.log('  - enriched_businesses.xlsx');
}

main().catch((err) => {
  console.error('\nFATAL ERROR:', err);
  process.exit(1);
});
