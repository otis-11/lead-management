const axios = require('axios');
const cheerio = require('cheerio');
const { extractDomain } = require('./utils');

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const OWNER_KEYWORDS = /\b(owner|founder|manager|president|ceo|principal|proprietor|director)\b/i;
const SUBPAGE_KEYWORDS = /\b(contact|about|team|staff|meet|our-team|leadership)\b/i;

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

/**
 * Fetch a page and return cheerio instance, or null on failure.
 */
async function fetchPage(url) {
  try {
    const resp = await axios.get(url, {
      headers: HEADERS,
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: (s) => s < 400,
    });
    return cheerio.load(resp.data);
  } catch {
    return null;
  }
}

/**
 * Extract emails from a cheerio instance.
 */
function extractEmails($) {
  const emails = new Set();
  // mailto links
  $('a[href^="mailto:"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const addr = href.replace('mailto:', '').split('?')[0].trim().toLowerCase();
    if (addr && addr.includes('@')) emails.add(addr);
  });
  // plain text regex
  const bodyText = $('body').text() || '';
  const found = bodyText.match(EMAIL_REGEX) || [];
  found.forEach((e) => {
    const lower = e.toLowerCase();
    // skip image file extensions
    if (/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(lower)) return;
    emails.add(lower);
  });
  // JSON-LD
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html());
      const candidates = Array.isArray(json) ? json : [json];
      for (const obj of candidates) {
        if (obj.email) emails.add(obj.email.toLowerCase().replace('mailto:', ''));
        if (obj.contactPoint) {
          const cp = Array.isArray(obj.contactPoint) ? obj.contactPoint : [obj.contactPoint];
          cp.forEach((c) => {
            if (c.email) emails.add(c.email.toLowerCase().replace('mailto:', ''));
          });
        }
      }
    } catch {}
  });
  return Array.from(emails);
}

/**
 * Try to extract an owner/manager name from page text.
 */
function extractOwnerName($) {
  // JSON-LD person / founder
  const names = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html());
      const candidates = Array.isArray(json) ? json : [json];
      for (const obj of candidates) {
        if (obj.founder && obj.founder.name) names.push(obj.founder.name);
        if (obj['@type'] === 'Person' && obj.name) names.push(obj.name);
      }
    } catch {}
  });
  if (names.length > 0) return names[0];

  // Heuristic: scan text nodes near owner-related keywords
  const bodyHtml = $('body').html() || '';
  const lines = bodyHtml
    .replace(/<[^>]+>/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    if (OWNER_KEYWORDS.test(lines[i])) {
      // check same line for a name pattern: capitalized words
      const combined = lines[i] + ' ' + (lines[i + 1] || '');
      const nameMatch = combined.match(
        /(?:owner|founder|manager|president|ceo|principal|proprietor|director)[:\s,\-–—]*([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,3})/i
      );
      if (nameMatch) return nameMatch[1].trim();
    }
  }
  return '';
}

/**
 * Determine if a website is "modern".
 * Returns "yes", "no", or "none".
 */
function assessModern($) {
  // check meta viewport
  const hasViewport = $('meta[name="viewport"]').length > 0;

  // check copyright year
  const bodyText = $('body').text() || '';
  const copyrightMatch = bodyText.match(/©\s*(\d{4})|copyright\s*(\d{4})/i);
  let copyrightYear = null;
  if (copyrightMatch) {
    copyrightYear = parseInt(copyrightMatch[1] || copyrightMatch[2], 10);
  }

  if (!hasViewport) return 'no';
  if (copyrightYear && copyrightYear < 2020) return 'no';
  return 'yes';
}

/**
 * Discover internal subpage URLs from homepage navigation.
 */
function discoverSubpages($, baseUrl) {
  const urls = new Set();
  const domain = extractDomain(baseUrl);
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (SUBPAGE_KEYWORDS.test(href)) {
      try {
        const resolved = new URL(href, baseUrl).href;
        const resolvedDomain = extractDomain(resolved);
        if (resolvedDomain === domain) urls.add(resolved);
      } catch {}
    }
  });
  return Array.from(urls).slice(0, 5); // cap at 5
}

/**
 * Scrape a business website for email, owner name, and modernity assessment.
 * @param {string} websiteUrl
 * @returns {object} { email, owner_name, website_modern, _notes }
 */
async function scrapeWebsite(websiteUrl) {
  if (!websiteUrl) {
    return { email: '', owner_name: '', website_modern: 'none', _notes: 'No website' };
  }

  const notes = [];
  let allEmails = [];
  let ownerName = '';
  let modern = 'none';

  // Fetch homepage
  const home$ = await fetchPage(websiteUrl);
  if (!home$) {
    notes.push('Failed to fetch homepage');
    return { email: '', owner_name: '', website_modern: 'none', _notes: notes.join('; ') };
  }

  modern = assessModern(home$);
  if (modern === 'no') notes.push('Site flagged outdated');

  allEmails.push(...extractEmails(home$));
  ownerName = extractOwnerName(home$);
  if (ownerName) notes.push('Owner found on homepage');

  // Discover and scrape subpages
  const subpages = discoverSubpages(home$, websiteUrl);
  // Also try /contact explicitly
  try {
    const contactUrl = new URL('/contact', websiteUrl).href;
    if (!subpages.includes(contactUrl)) subpages.unshift(contactUrl);
  } catch {}

  for (const url of subpages) {
    const sub$ = await fetchPage(url);
    if (!sub$) continue;

    const subEmails = extractEmails(sub$);
    if (subEmails.length > 0) {
      allEmails.push(...subEmails);
      notes.push(`Email found on ${new URL(url).pathname}`);
    }

    if (!ownerName) {
      const subOwner = extractOwnerName(sub$);
      if (subOwner) {
        ownerName = subOwner;
        notes.push(`Owner found on ${new URL(url).pathname}`);
      }
    }
  }

  // De-duplicate emails, pick best (prefer non-generic)
  const uniqueEmails = [...new Set(allEmails)];
  const genericPrefixes = ['info', 'admin', 'support', 'contact', 'hello', 'noreply', 'sales'];
  let chosenEmail = '';
  if (uniqueEmails.length > 0) {
    const personal = uniqueEmails.filter(
      (e) => !genericPrefixes.some((g) => e.startsWith(g + '@'))
    );
    chosenEmail = personal.length > 0 ? personal[0] : uniqueEmails[0];
  }

  return {
    email: chosenEmail,
    owner_name: ownerName,
    website_modern: modern,
    _notes: notes.join('; '),
  };
}

module.exports = { scrapeWebsite };
