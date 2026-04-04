const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Normalize a phone number to digits only (strip dashes, parens, spaces, dots).
 * Returns empty string if input is falsy.
 */
function normalizePhone(phone) {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/**
 * Extract registrable domain from a URL string.
 * e.g. "https://www.example.com/about" -> "example.com"
 */
function extractDomain(url) {
  if (!url) return '';
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return hostname;
  } catch {
    return '';
  }
}

/**
 * Normalize a business name for fuzzy comparison:
 * lowercase, strip punctuation, collapse whitespace, sort tokens.
 */
function normalizeNameTokens(name) {
  if (!name) return [];
  return name
    .toLowerCase()
    .replace(/[''""`.!?,;:()&\-\/\\#@]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort();
}

/**
 * Simple token-overlap similarity between two name strings (0-1).
 */
function nameSimilarity(a, b) {
  const tokA = normalizeNameTokens(a);
  const tokB = normalizeNameTokens(b);
  if (tokA.length === 0 || tokB.length === 0) return 0;
  const setB = new Set(tokB);
  const overlap = tokA.filter((t) => setB.has(t)).length;
  return overlap / Math.max(tokA.length, tokB.length);
}

/**
 * Build a stable row key used for checkpointing.
 */
function rowKey(row) {
  const cat = (row.category || '').trim();
  const name = (row.business_name || '').trim();
  const phone = normalizePhone(row.phone);
  return `${cat}|${name}|${phone}`;
}

module.exports = {
  sleep,
  normalizePhone,
  extractDomain,
  normalizeNameTokens,
  nameSimilarity,
  rowKey,
};
