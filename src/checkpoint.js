const fs = require('fs');
const path = require('path');

const CHECKPOINT_FILE = path.join(__dirname, '..', 'progress_checkpoint.json');

/**
 * Load checkpoint data. Returns { processedKeys: Set, results: [] }.
 */
function loadCheckpoint() {
  if (!fs.existsSync(CHECKPOINT_FILE)) {
    return { processedKeys: new Set(), results: [] };
  }
  try {
    const raw = fs.readFileSync(CHECKPOINT_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return {
      processedKeys: new Set(data.processedKeys || []),
      results: data.results || [],
    };
  } catch (err) {
    console.error('[checkpoint] Failed to parse checkpoint file, starting fresh:', err.message);
    return { processedKeys: new Set(), results: [] };
  }
}

/**
 * Save checkpoint data to disk.
 * @param {Set} processedKeys
 * @param {Array} results
 */
function saveCheckpoint(processedKeys, results) {
  const data = {
    processedKeys: Array.from(processedKeys),
    results,
    savedAt: new Date().toISOString(),
  };
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`[checkpoint] Saved ${results.length} records`);
}

module.exports = { loadCheckpoint, saveCheckpoint };
