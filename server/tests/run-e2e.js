'use strict';

/**
 * Ploye.pe Payroll Management System - E2E Standalone Test Runner
 * Executes test suites across Tiers 1-4 using Node 26 native node:test engine.
 */

// 1. Initialize global test environment and R5 safety checks
require('./setup');

const fs = require('fs');
const path = require('path');
const { run } = require('node:test');
const { spec } = require('node:test/reporters');

function findTestFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findTestFiles(fullPath, fileList);
    } else if (entry.isFile() && entry.name.endsWith('.test.js')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

async function main() {
  const e2eDir = path.resolve(__dirname, 'e2e');
  const files = findTestFiles(e2eDir).sort();

  console.log('\n=============================================================');
  console.log('   Ploye.pe E2E Test Suite Runner (Requirements R1 - R5)');
  console.log('   Isolation   : In-Memory / Safe Local Database (R5 Compliant)');
  console.log('   Node Engine : ' + process.version);
  console.log(`   Found       : ${files.length} test files`);
  console.log('=============================================================\n');

  if (files.length === 0) {
    console.warn('No test files found in:', e2eDir);
    process.exit(0);
  }

  let hasFailures = false;

  const testStream = run({
    files,
    concurrency: 1, // Sequential execution for deterministic isolation
  });

  testStream.on('test:fail', (data) => {
    hasFailures = true;
  });

  const reporter = new spec();
  testStream.compose(reporter).pipe(process.stdout);

  testStream.on('end', () => {
    if (hasFailures) {
      console.error('\n❌ E2E Test Suite Finished with FAILURES.');
      process.exit(1);
    } else {
      console.log('\n✅ All E2E Tests Executed and Passed Successfully.');
      process.exit(0);
    }
  });
}

main().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
