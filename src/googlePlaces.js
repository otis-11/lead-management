const axios = require('axios');
const { normalizePhone, nameSimilarity } = require('./utils');

const CITIES = ['Belton TX', 'Temple TX', 'Killeen TX'];

/**
 * Search Google Places for a business across multiple cities and return the best match.
 * @param {string} businessName
 * @param {string} inputPhone - original phone from CSV (may be empty)
 * @returns {object} enrichment fields or empty object
 */
async function lookupGooglePlaces(businessName, inputPhone) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    return { _notes: 'Google Places API key not configured' };
  }

  const normalizedInput = normalizePhone(inputPhone);
  let bestCandidate = null;
  let bestScore = -1;

  for (const city of CITIES) {
    try {
      const query = `${businessName} ${city}`;
      const searchResp = await axios.get(
        'https://maps.googleapis.com/maps/api/place/textsearch/json',
        {
          params: { query, key: apiKey },
          timeout: 10000,
        }
      );

      const results = (searchResp.data && searchResp.data.results) || [];
      // evaluate top 3 candidates per city
      for (const place of results.slice(0, 3)) {
        const placeId = place.place_id;
        if (!placeId) continue;

        // fetch details
        const detailResp = await axios.get(
          'https://maps.googleapis.com/maps/api/place/details/json',
          {
            params: {
              place_id: placeId,
              fields:
                'name,formatted_address,website,rating,user_ratings_total,formatted_phone_number',
              key: apiKey,
            },
            timeout: 10000,
          }
        );

        const d = (detailResp.data && detailResp.data.result) || {};

        // score candidate
        let score = 0;
        const detailPhone = normalizePhone(d.formatted_phone_number);
        const phoneMatch = normalizedInput && detailPhone && normalizedInput === detailPhone;
        if (phoneMatch) score += 100;
        score += nameSimilarity(businessName, d.name || '') * 50;
        score += (d.user_ratings_total || 0) * 0.001; // tiny tiebreaker

        if (score > bestScore) {
          bestScore = score;
          bestCandidate = {
            address: d.formatted_address || '',
            website_url: d.website || '',
            google_rating: d.rating != null ? String(d.rating) : '',
            review_count: d.user_ratings_total != null ? String(d.user_ratings_total) : '',
            _matchCity: city,
            _phoneMatch: phoneMatch,
            _nameSim: nameSimilarity(businessName, d.name || '').toFixed(2),
          };
        }
      }
    } catch (err) {
      console.error(`[google] Error searching "${businessName}" in ${city}: ${err.message}`);
    }
  }

  if (!bestCandidate) {
    return { _notes: 'No Google Places match found' };
  }

  const notes = [];
  notes.push(`Google match in ${bestCandidate._matchCity}`);
  if (bestCandidate._phoneMatch) {
    notes.push('phone confirmed');
  } else {
    notes.push(`name similarity ${bestCandidate._nameSim}`);
  }

  return {
    address: bestCandidate.address,
    website_url: bestCandidate.website_url,
    google_rating: bestCandidate.google_rating,
    review_count: bestCandidate.review_count,
    _notes: notes.join('; '),
  };
}

module.exports = { lookupGooglePlaces };
