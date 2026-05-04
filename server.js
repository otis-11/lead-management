require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { v4: uuidv4 } = require('uuid');
const { writeOutputs } = require('./src/output');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Eagerly start loading data at module init (matters on serverless cold starts).
// Defined here so the gating middleware below can reference it before routes.
let dataReady;

// Gate every request behind dataReady so cold-start race conditions can't
// return an empty array.
app.use(async (req, res, next) => {
  try {
    if (dataReady) await dataReady;
    next();
  } catch (err) {
    next(err);
  }
});

// Serve static frontend
app.use(express.static(path.join(__dirname, 'client', 'dist')));

const DATA_FILE = path.join(__dirname, 'data.json');
const ENRICHED_CSV = path.join(__dirname, 'enriched_businesses.csv');

// ── Data layer ──────────────────────────────────────────

let businesses = [];

function loadData() {
  // Prefer data.json if it exists (has IDs + edits)
  if (fs.existsSync(DATA_FILE)) {
    try {
      businesses = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      console.log(`[server] Loaded ${businesses.length} records from data.json`);
      return;
    } catch (err) {
      console.error('[server] Failed to parse data.json:', err.message);
    }
  }

  // Fall back to enriched CSV
  if (fs.existsSync(ENRICHED_CSV)) {
    businesses = [];
    return new Promise((resolve, reject) => {
      fs.createReadStream(ENRICHED_CSV)
        .pipe(csv())
        .on('data', (row) => {
          businesses.push({
            id: uuidv4(),
            category: row.category || '',
            business_name: row.business_name || '',
            phone: row.phone || '',
            owner_name: row.owner_name || '',
            email: row.email || '',
            website_url: row.website_url || '',
            address: row.address || '',
            google_rating: row.google_rating || '',
            review_count: row.review_count || '',
            website_modern: row.website_modern || 'none',
            enrichment_notes: row.enrichment_notes || '',
          });
        })
        .on('end', () => {
          console.log(`[server] Loaded ${businesses.length} records from enriched CSV`);
          saveData();
          resolve();
        })
        .on('error', reject);
    });
  }

  // Fall back to original input CSV
  const inputCsv = path.join(__dirname, 'businesses.csv');
  if (fs.existsSync(inputCsv)) {
    businesses = [];
    return new Promise((resolve, reject) => {
      fs.createReadStream(inputCsv)
        .pipe(csv())
        .on('data', (row) => {
          businesses.push({
            id: uuidv4(),
            category: (row.category || '').trim(),
            business_name: (row.business_name || '').trim(),
            phone: (row.phone || '').trim(),
            owner_name: '',
            email: '',
            website_url: '',
            address: '',
            google_rating: '',
            review_count: '',
            website_modern: 'none',
            enrichment_notes: '',
          });
        })
        .on('end', () => {
          console.log(`[server] Loaded ${businesses.length} records from businesses.csv (raw input)`);
          saveData();
          resolve();
        })
        .on('error', reject);
    });
  }

  console.log('[server] No data files found');
}

// On Vercel (and other read-only FS environments) writes will fail.
// We catch and warn instead of crashing so the API stays up.
const IS_READONLY_FS = !!process.env.VERCEL;

function saveData() {
  if (IS_READONLY_FS) {
    console.warn('[server] Skipping saveData(): running on read-only filesystem (Vercel). Edits will not persist.');
    return;
  }
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(businesses, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[server] saveData() failed:', err.message);
  }
}

// ── API Routes ──────────────────────────────────────────

// GET all businesses
app.get('/api/businesses', (req, res) => {
  res.json(businesses);
});

// GET summary stats
app.get('/api/summary', (req, res) => {
  const catMap = {};
  for (const b of businesses) {
    const cat = b.category || 'Unknown';
    if (!catMap[cat]) {
      catMap[cat] = { total: 0, withEmail: 0, withOwner: 0, withWebsite: 0, enriched: 0 };
    }
    const s = catMap[cat];
    s.total++;
    if (b.email) s.withEmail++;
    if (b.owner_name) s.withOwner++;
    if (b.website_url) s.withWebsite++;
    if (b.email || b.owner_name || b.website_url) s.enriched++;
  }

  const categories = Object.entries(catMap).map(([name, stats]) => ({
    name,
    ...stats,
    enrichRate: stats.total > 0 ? ((stats.enriched / stats.total) * 100).toFixed(1) : '0.0',
  }));

  const grandTotal = businesses.length;
  const grandEnriched = businesses.filter(
    (b) => b.email || b.owner_name || b.website_url
  ).length;

  res.json({
    categories,
    overall: {
      total: grandTotal,
      enriched: grandEnriched,
      withEmail: businesses.filter((b) => b.email).length,
      withOwner: businesses.filter((b) => b.owner_name).length,
      withWebsite: businesses.filter((b) => b.website_url).length,
      enrichRate: grandTotal > 0 ? ((grandEnriched / grandTotal) * 100).toFixed(1) : '0.0',
    },
  });
});

// GET single business
app.get('/api/businesses/:id', (req, res) => {
  const biz = businesses.find((b) => b.id === req.params.id);
  if (!biz) return res.status(404).json({ error: 'Not found' });
  res.json(biz);
});

// PUT update a business
app.put('/api/businesses/:id', (req, res) => {
  const idx = businesses.findIndex((b) => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  const allowed = [
    'category', 'business_name', 'phone', 'owner_name', 'email',
    'website_url', 'address', 'google_rating', 'review_count',
    'website_modern', 'enrichment_notes',
  ];

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      businesses[idx][key] = req.body[key];
    }
  }

  saveData();
  res.json(businesses[idx]);
});

// POST add a new business
app.post('/api/businesses', (req, res) => {
  const newBiz = {
    id: uuidv4(),
    category: req.body.category || '',
    business_name: req.body.business_name || '',
    phone: req.body.phone || '',
    owner_name: req.body.owner_name || '',
    email: req.body.email || '',
    website_url: req.body.website_url || '',
    address: req.body.address || '',
    google_rating: req.body.google_rating || '',
    review_count: req.body.review_count || '',
    website_modern: req.body.website_modern || 'none',
    enrichment_notes: req.body.enrichment_notes || '',
  };
  businesses.push(newBiz);
  saveData();
  res.status(201).json(newBiz);
});

// DELETE a business
app.delete('/api/businesses/:id', (req, res) => {
  const idx = businesses.findIndex((b) => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const removed = businesses.splice(idx, 1);
  saveData();
  res.json(removed[0]);
});

// POST export to CSV + XLSX
app.post('/api/export', async (req, res) => {
  if (IS_READONLY_FS) {
    return res.status(501).json({
      error: 'Export is unavailable on the deployed (serverless) site. Run the app locally to export CSV/XLSX.',
    });
  }
  try {
    const exportData = businesses.map(({ id, ...rest }) => rest);
    await writeOutputs(exportData);
    res.json({ success: true, message: 'Exported enriched_businesses.csv and .xlsx' });
  } catch (err) {
    console.error('[server] Export error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET distinct categories
app.get('/api/categories', (req, res) => {
  const cats = [...new Set(businesses.map((b) => b.category).filter(Boolean))];
  res.json(cats);
});

// Catch-all: serve React app
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'client', 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend not built yet. Run: cd client && npm run build');
  }
});

// ── Start ───────────────────────────────────────────────

// Kick off data load now that loadData() is defined. The middleware above
// will await this on each request.
dataReady = Promise.resolve(loadData()).catch((err) => {
  console.error('[server] loadData failed:', err);
});

async function start() {
  await dataReady;
  app.listen(PORT, () => {
    console.log(`\n  Admin Dashboard API running on http://localhost:${PORT}\n`);
  });
}

// Only auto-start the HTTP server when running locally (node server.js).
// On Vercel (serverless), we just export the app.
if (require.main === module && !process.env.VERCEL) {
  start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

module.exports = app;
