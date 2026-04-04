const axios = require('axios');
const { extractDomain } = require('./utils');

/**
 * Use Hunter.io Domain Search to find an email for a given website URL.
 * @param {string} websiteUrl
 * @returns {object} { email, _notes }
 */
async function hunterEmailSearch(websiteUrl) {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    return { email: '', _notes: 'Hunter API key not configured' };
  }

  const domain = extractDomain(websiteUrl);
  if (!domain) {
    return { email: '', _notes: 'No domain to search Hunter' };
  }

  try {
    const resp = await axios.get('https://api.hunter.io/v2/domain-search', {
      params: {
        domain,
        api_key: apiKey,
      },
      timeout: 10000,
    });

    const data = resp.data && resp.data.data;
    if (!data || !data.emails || data.emails.length === 0) {
      return { email: '', _notes: `Hunter: no emails for ${domain}` };
    }

    // Sort by confidence descending, prefer personal type
    const sorted = [...data.emails].sort((a, b) => {
      if (a.type === 'personal' && b.type !== 'personal') return -1;
      if (b.type === 'personal' && a.type !== 'personal') return 1;
      return (b.confidence || 0) - (a.confidence || 0);
    });

    const best = sorted[0];
    return {
      email: best.value || '',
      _notes: `Hunter: ${best.value} (confidence ${best.confidence}%, type ${best.type})`,
    };
  } catch (err) {
    console.error(`[hunter] Error for domain ${domain}: ${err.message}`);
    return { email: '', _notes: `Hunter error: ${err.message}` };
  }
}

module.exports = { hunterEmailSearch };
