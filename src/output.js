const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const ExcelJS = require('exceljs');

const OUTPUT_DIR = path.join(__dirname, '..');
const CSV_PATH = path.join(OUTPUT_DIR, 'enriched_businesses.csv');
const XLSX_PATH = path.join(OUTPUT_DIR, 'enriched_businesses.xlsx');

const COLUMNS = [
  'category',
  'business_name',
  'phone',
  'owner_name',
  'email',
  'website_url',
  'address',
  'google_rating',
  'review_count',
  'website_modern',
  'enrichment_notes',
];

/**
 * Write enriched results to CSV.
 */
async function writeCsv(results) {
  const writer = createCsvWriter({
    path: CSV_PATH,
    header: COLUMNS.map((c) => ({ id: c, title: c })),
  });
  await writer.writeRecords(results);
  console.log(`[output] CSV written to ${CSV_PATH} (${results.length} rows)`);
}

/**
 * Determine row color category.
 * Returns 'green', 'yellow', or 'red'.
 */
function rowColor(row) {
  if (row.email) return 'green';
  if (row.website_url || row.owner_name) return 'yellow';
  return 'red';
}

/**
 * Write enriched results to formatted XLSX with Enriched + Summary sheets.
 */
async function writeXlsx(results) {
  const workbook = new ExcelJS.Workbook();

  // ── Enriched sheet ──
  const ws = workbook.addWorksheet('Enriched');

  // Header row
  ws.columns = COLUMNS.map((col) => ({
    header: col,
    key: col,
    width: col === 'enrichment_notes' ? 50 : col === 'address' ? 35 : 22,
  }));

  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }, // blue
  };
  headerRow.alignment = { vertical: 'middle' };

  // Freeze top row
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  // Data rows
  const COLOR_MAP = {
    green: 'FFD5F5E3',  // light green
    yellow: 'FFFEF9E7', // light yellow
    red: 'FFFADBD8',    // light red
  };

  for (const record of results) {
    const row = ws.addRow(record);
    const color = rowColor(record);
    row.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLOR_MAP[color] },
    };
  }

  // ── Summary sheet ──
  const summary = workbook.addWorksheet('Summary');
  summary.columns = [
    { header: 'Category', key: 'category', width: 25 },
    { header: 'Total', key: 'total', width: 10 },
    { header: 'With Email', key: 'withEmail', width: 14 },
    { header: 'With Owner', key: 'withOwner', width: 14 },
    { header: 'With Website', key: 'withWebsite', width: 14 },
    { header: 'Enrichment Rate %', key: 'enrichRate', width: 18 },
  ];

  const summaryHeader = summary.getRow(1);
  summaryHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  summaryHeader.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  summary.views = [{ state: 'frozen', ySplit: 1 }];

  // Aggregate by category
  const catMap = new Map();
  for (const r of results) {
    const cat = r.category || 'Unknown';
    if (!catMap.has(cat)) {
      catMap.set(cat, { total: 0, withEmail: 0, withOwner: 0, withWebsite: 0, enriched: 0 });
    }
    const s = catMap.get(cat);
    s.total++;
    if (r.email) s.withEmail++;
    if (r.owner_name) s.withOwner++;
    if (r.website_url) s.withWebsite++;
    if (r.email || r.owner_name || r.website_url) s.enriched++;
  }

  let grandTotal = 0;
  let grandEnriched = 0;

  for (const [cat, s] of catMap) {
    const rate = s.total > 0 ? ((s.enriched / s.total) * 100).toFixed(1) : '0.0';
    summary.addRow({
      category: cat,
      total: s.total,
      withEmail: s.withEmail,
      withOwner: s.withOwner,
      withWebsite: s.withWebsite,
      enrichRate: `${rate}%`,
    });
    grandTotal += s.total;
    grandEnriched += s.enriched;
  }

  // Overall row
  const overallRate =
    grandTotal > 0 ? ((grandEnriched / grandTotal) * 100).toFixed(1) : '0.0';
  const overallRow = summary.addRow({
    category: 'OVERALL',
    total: grandTotal,
    withEmail: results.filter((r) => r.email).length,
    withOwner: results.filter((r) => r.owner_name).length,
    withWebsite: results.filter((r) => r.website_url).length,
    enrichRate: `${overallRate}%`,
  });
  overallRow.font = { bold: true };

  await workbook.xlsx.writeFile(XLSX_PATH);
  console.log(`[output] XLSX written to ${XLSX_PATH}`);
}

/**
 * Write both CSV and XLSX outputs.
 */
async function writeOutputs(results) {
  await writeCsv(results);
  await writeXlsx(results);
}

module.exports = { writeOutputs };
