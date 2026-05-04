// Vercel serverless function entry point.
// Vercel routes /api/* requests here; we delegate to the Express app
// which already has all the /api/* routes defined.
module.exports = require('../server.js');
