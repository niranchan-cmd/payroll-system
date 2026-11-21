'use strict';

/**
 * Safety Guard (Requirement R5):
 * Ensures no test or benchmarking execution interacts with live production Neon databases or cloud environments.
 */
function assertIsolatedEnvironment() {
  const dbUrl = process.env.DATABASE_URL || '';
  const forbiddenPatterns = [
    'neon.tech',
    'aws.neon',
    'pooler.neon.tech',
    'ep-',
    'rds.amazonaws.com',
    'production',
    'neondb_owner'
  ];

  for (const pattern of forbiddenPatterns) {
    if (dbUrl.toLowerCase().includes(pattern.toLowerCase())) {
      const errorMsg = `FATAL R5 SAFETY VIOLATION: Production database pattern '${pattern}' detected in DATABASE_URL ('${dbUrl}'). Test suite execution aborted.`;
      console.error('\n======================================================');
      console.error(errorMsg);
      console.error('======================================================\n');
      throw new Error(errorMsg);
    }
  }

  return true;
}

module.exports = {
  assertIsolatedEnvironment,
};
