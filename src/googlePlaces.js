const axios = require('axios');
const { normalizePhone, nameSimilarity } = require('./utils');

const CITIES = ['Belton TX', 'Temple TX', 'Killeen TX'];

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.nationalPhoneNumber',
].join(',');

/**
 * Search Google Places (New API) for a business across multiple cities
 * and return the best match.
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
      const textQuery = `${businessName} ${city}`;
      const searchResp = await axios.post(
        'https://places.googleapis.com/v1/places:searchText',
        { textQuery },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': FIELD_MASK,
          },
          timeout: 10000,
        }
      );

      const places = (searchResp.data && searchResp.data.places) || [];
      for (const place of places.slice(0, 3)) {
        const name = (place.displayName && place.displayName.text) || '';
        const detailPhone = normalizePhone(place.nationalPhoneNumber);
        const phoneMatch = normalizedInput && detailPhone && normalizedInput === detailPhone;

        let score = 0;
        if (phoneMatch) score += 100;
        score += nameSimilarity(businessName, name) * 50;
        score += (place.userRatingCount || 0) * 0.001;

        if (score > bestScore) {
          bestScore = score;
          bestCandidate = {
            address: place.formattedAddress || '',
            website_url: place.websiteUri || '',
            google_rating: place.rating != null ? String(place.rating) : '',
            review_count: place.userRatingCount != null ? String(place.userRatingCount) : '',
            _matchCity: city,
            _phoneMatch: phoneMatch,
            _nameSim: nameSimilarity(businessName, name).toFixed(2),
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
