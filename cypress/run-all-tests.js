/**
 * Comprehensive Test Runner
 *
 * This script runs all Cypress tests in a specific order to ensure
 * proper test execution and comprehensive coverage.
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting Boukii Admin Panel E2E Test Suite');
console.log('=' .repeat(60));

const testSuites = [
  {
    name: 'Bug Fixes Validation',
    file: 'bug-fixes-validation.cy.ts',
    description: 'Validates all critical bug fixes'
  },
  {
    name: 'Course Management',
    file: 'course-management.cy.ts',
    description: 'Tests course creation, editing, and management'
  },
  {
    name: 'Booking Management',
    file: 'booking-management.cy.ts',
    description: 'Tests booking workflows and validation'
  },
  {
    name: 'User Management',
    file: 'user-management.cy.ts',
    description: 'Tests client and monitor management'
  },
  {
    name: 'Scheduler Integration',
    file: 'scheduler-integration.cy.ts',
    description: 'Tests calendar and scheduler functionality'
  },
  {
    name: 'Financial Management',
    file: 'financial-management.cy.ts',
    description: 'Tests payment and financial workflows'
  },
  {
    name: 'System Settings',
    file: 'system-settings.cy.ts',
    description: 'Tests system configuration and settings'
  },
  {
    name: 'Performance & Integration',
    file: 'performance-and-integration.cy.ts',
    description: 'Tests performance and integration scenarios'
  },
  {
    name: 'Complete Workflow Validation',
    file: 'complete-workflow-validation.cy.ts',
    description: 'End-to-end workflow validation'
  }
];

const runOptions = {
  headless: process.argv.includes('--headless'),
  browser: process.argv.includes('--chrome') ? 'chrome' :
          process.argv.includes('--firefox') ? 'firefox' : 'electron',
  record: process.argv.includes('--record'),
  parallel: process.argv.includes('--parallel')
};

console.log(`Browser: ${runOptions.browser}`);
console.log(`Mode: ${runOptions.headless ? 'Headless' : 'Headed'}`);
console.log('');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failedSuites = [];

async function runTestSuite(suite) {
  console.log(`📋 Running: ${suite.name}`);
  console.log(`   ${suite.description}`);

  try {
    let command = `cypress run --spec "cypress/e2e/${suite.file}"`;

    if (runOptions.browser !== 'electron') {
      command += ` --browser ${runOptions.browser}`;
    }

    if (runOptions.record) {
      command += ' --record';
    }

    if (!runOptions.headless) {
      command = command.replace('run', 'open');
    }

    const result = execSync(command, {
      stdio: 'pipe',
      encoding: 'utf8',
      cwd: process.cwd()
    });

    // Parse results (simplified - would need more robust parsing in production)
    const lines = result.split('\n');
    const passedLine = lines.find(line => line.includes('passing'));
    const failedLine = lines.find(line => line.includes('failing'));

    const passed = passedLine ? parseInt(passedLine.match(/(\d+)/)?.[1] || '0') : 0;
    const failed = failedLine ? parseInt(failedLine.match(/(\d+)/)?.[1] || '0') : 0;

    totalTests += passed + failed;
    passedTests += passed;
    failedTests += failed;

    if (failed > 0) {
      failedSuites.push(suite.name);
      console.log(`   ❌ FAILED: ${failed} test(s) failed, ${passed} passed`);
    } else {
      console.log(`   ✅ PASSED: ${passed} test(s) passed`);
    }

  } catch (error) {
    console.log(`   ❌ ERROR: Test suite failed to run`);
    console.log(`   ${error.message.split('\n')[0]}`);
    failedSuites.push(suite.name);
    failedTests++;
    totalTests++;
  }

  console.log('');
}

async function runAllTests() {
  const startTime = Date.now();

  for (const suite of testSuites) {
    await runTestSuite(suite);
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000 / 60).toFixed(2);

  console.log('=' .repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(60));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log(`Success Rate: ${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0}%`);
  console.log(`Duration: ${duration} minutes`);

  if (failedSuites.length > 0) {
    console.log('');
    console.log('❌ FAILED SUITES:');
    failedSuites.forEach(suite => console.log(`   - ${suite}`));
  }

  console.log('');
  console.log(failedTests === 0 ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED - Please review and fix');

  process.exit(failedTests > 0 ? 1 : 0);
}

// Handle command line arguments
if (process.argv.includes('--help')) {
  console.log(`
Usage: node run-all-tests.js [options]

Options:
  --headless     Run tests in headless mode
  --chrome       Use Chrome browser
  --firefox      Use Firefox browser
  --record       Record test run to Cypress Dashboard
  --parallel     Run tests in parallel
  --help         Show this help message

Examples:
  node run-all-tests.js                    # Run all tests with electron
  node run-all-tests.js --headless         # Run in headless mode
  node run-all-tests.js --chrome --headless # Run with Chrome headless
  node run-all-tests.js --record           # Record to dashboard
  `);
  process.exit(0);
}

runAllTests();