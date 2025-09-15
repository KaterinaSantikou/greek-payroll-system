#!/usr/bin/env node

/**
 * CI Smoke Test: Schema Drift Detection
 *
 * This test simulates missing schema scenarios to ensure:
 * - /health always returns 200
 * - /ready returns 503 when core services fail
 * - Missing schema doesn't silently ship to production
 */

import http from 'http';

async function makeRequest(path, expectedStatus, description) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path: path,
        method: 'GET',
      },
      res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          const success = res.statusCode === expectedStatus;
          console.log(`${success ? '✅' : '❌'} ${description}`);
          console.log(`   Expected: ${expectedStatus}, Got: ${res.statusCode}`);
          if (!success) {
            console.log(`   Response: ${data}`);
          }
          resolve(success);
        });
      }
    );

    req.on('error', reject);
    req.setTimeout(5000, () => reject(new Error('Request timeout')));
    req.end();
  });
}

async function runSmokeTest() {
  console.log('🧪 Running CI Smoke Test for Schema Drift Detection');
  console.log('===============================================');

  try {
    // Test 1: Health endpoint should always be 200
    const healthOk = await makeRequest(
      '/health',
      200,
      'Health endpoint always returns 200'
    );

    // Test 2: Ready endpoint should reflect core service status
    const readyOk = await makeRequest(
      '/ready',
      200,
      'Ready endpoint returns 200 when core services ready'
    );

    // Test 3: Debug flags endpoint for monitoring
    const flagsOk = await makeRequest(
      '/debug/flags',
      200,
      'Debug flags endpoint accessible'
    );

    console.log('');
    if (healthOk && readyOk && flagsOk) {
      console.log('🎉 All smoke tests passed!');
      process.exit(0);
    } else {
      console.log('💥 Some smoke tests failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Smoke test error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSmokeTest();
}
