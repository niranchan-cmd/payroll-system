/**
 * Vercel Serverless Entry Point
 *
 * Vercel imports this file and calls the exported Express app as a handler.
 * The VERCEL=1 env var prevents app.listen() from being called (see src/index.js).
 */
const app = require('../src/index');
module.exports = app;
