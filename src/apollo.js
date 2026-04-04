const axios = require('axios');

const DECISION_TITLES = /\b(owner|founder|manager|ceo|president|principal|director|partner)\b/i;

/**
 * Use Apollo.io People Search to find an owner/manager for a business.
 * @param {string} businessName
 * @returns {object} { owner_name, _notes }
 */
async function apolloOwnerSearch(businessName) {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    return { owner_name: '', _notes: 'Apollo API key not configured' };
  }

  try {
    const resp = await axios.post(
      'https://api.apollo.io/v1/mixed_people/search',
      {
        q_organization_name: businessName,
        person_locations: ['Texas, United States'],
        page: 1,
        per_page: 5,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Api-Key': apiKey,
        },
        timeout: 10000,
      }
    );

    const people = (resp.data && resp.data.people) || [];
    if (people.length === 0) {
      return { owner_name: '', _notes: 'Apollo: no people found' };
    }

    // Prefer decision-maker titles
    const decisionMaker = people.find((p) => DECISION_TITLES.test(p.title || ''));
    const chosen = decisionMaker || people[0];

    const name = [chosen.first_name, chosen.last_name].filter(Boolean).join(' ');
    const title = chosen.title || '';

    return {
      owner_name: name,
      _notes: `Apollo: ${name}${title ? ' (' + title + ')' : ''}`,
    };
  } catch (err) {
    console.error(`[apollo] Error for "${businessName}": ${err.message}`);
    return { owner_name: '', _notes: `Apollo error: ${err.message}` };
  }
}

module.exports = { apolloOwnerSearch };
