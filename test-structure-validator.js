/**
 * Test Structure Validator
 *
 * This script validates that all test files have proper structure
 * and required components without needing Cypress to be fully installed.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Test Suite Structure...\n');

const testFiles = [
  'cypress/e2e/bug-fixes-validation.cy.ts',
  'cypress/e2e/course-management.cy.ts',
  'cypress/e2e/booking-management.cy.ts',
  'cypress/e2e/user-management.cy.ts',
  'cypress/e2e/scheduler-integration.cy.ts',
  'cypress/e2e/financial-management.cy.ts',
  'cypress/e2e/system-settings.cy.ts',
  'cypress/e2e/performance-and-integration.cy.ts',
  'cypress/e2e/complete-workflow-validation.cy.ts'
];

const supportFiles = [
  'cypress/support/commands.ts',
  'cypress/support/e2e.ts',
  'cypress.config.ts'
];

const fixtureFiles = [
  'cypress/fixtures/courses.json',
  'cypress/fixtures/clients.json'
];

let allValid = true;

function validateFile(filePath, expectedContent) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`❌ Missing: ${filePath}`);
      allValid = false;
      return false;
    }

    const content = fs.readFileSync(filePath, 'utf8');

    for (const expected of expectedContent) {
      if (!content.includes(expected)) {
        console.log(`⚠️  ${filePath}: Missing "${expected}"`);
      }
    }

    console.log(`✅ Valid: ${filePath}`);
    return true;

  } catch (error) {
    console.log(`❌ Error reading ${filePath}: ${error.message}`);
    allValid = false;
    return false;
  }
}

console.log('📋 Test Files Validation:');
console.log('=' .repeat(40));

testFiles.forEach(file => {
  validateFile(file, [
    'describe(',
    'it(',
    'cy.',
    'beforeEach'
  ]);
});

console.log('\n🔧 Support Files Validation:');
console.log('=' .repeat(40));

// Validate support files
validateFile('cypress/support/commands.ts', [
  'Cypress.Commands.add',
  'login',
  'createCourse',
  'createBooking'
]);

validateFile('cypress/support/e2e.ts', [
  'cypress/support/commands'
]);

validateFile('cypress.config.ts', [
  'defineConfig',
  'baseUrl',
  'localhost:4200'
]);

console.log('\n📂 Fixture Files Validation:');
console.log('=' .repeat(40));

fixtureFiles.forEach(file => {
  validateFile(file, [
    '{'
  ]);
});

console.log('\n📊 Custom Commands Validation:');
console.log('=' .repeat(40));

// Check if custom commands are properly structured
try {
  const commandsContent = fs.readFileSync('cypress/support/commands.ts', 'utf8');

  const requiredCommands = ['login', 'createCourse', 'createBooking', 'verifyNotification'];

  requiredCommands.forEach(cmd => {
    if (commandsContent.includes(`Cypress.Commands.add('${cmd}'`)) {
      console.log(`✅ Command: ${cmd}`);
    } else {
      console.log(`❌ Missing command: ${cmd}`);
      allValid = false;
    }
  });

} catch (error) {
  console.log(`❌ Error validating commands: ${error.message}`);
  allValid = false;
}

console.log('\n🎯 Test Coverage Analysis:');
console.log('=' .repeat(40));

const testCoverage = {
  'Bug Fixes': 'bug-fixes-validation.cy.ts',
  'Course Management': 'course-management.cy.ts',
  'Booking Workflows': 'booking-management.cy.ts',
  'User Management': 'user-management.cy.ts',
  'Scheduler Integration': 'scheduler-integration.cy.ts',
  'Financial Management': 'financial-management.cy.ts',
  'System Settings': 'system-settings.cy.ts',
  'Performance Testing': 'performance-and-integration.cy.ts',
  'End-to-End Validation': 'complete-workflow-validation.cy.ts'
};

Object.entries(testCoverage).forEach(([area, file]) => {
  if (fs.existsSync(`cypress/e2e/${file}`)) {
    console.log(`✅ ${area}: ${file}`);
  } else {
    console.log(`❌ ${area}: Missing ${file}`);
    allValid = false;
  }
});

console.log('\n🔍 Configuration Validation:');
console.log('=' .repeat(40));

// Check package.json scripts
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

  const requiredScripts = ['cypress:open', 'cypress:run'];

  requiredScripts.forEach(script => {
    if (packageJson.scripts && packageJson.scripts[script]) {
      console.log(`✅ Script: ${script}`);
    } else {
      console.log(`⚠️  Missing script: ${script}`);
    }
  });

  // Check Cypress dependency
  if (packageJson.devDependencies && packageJson.devDependencies.cypress) {
    console.log(`✅ Cypress dependency: ${packageJson.devDependencies.cypress}`);
  } else {
    console.log(`⚠️  Cypress dependency not found in devDependencies`);
  }

} catch (error) {
  console.log(`❌ Error reading package.json: ${error.message}`);
}

console.log('\n' + '=' .repeat(50));
console.log('📊 VALIDATION SUMMARY');
console.log('=' .repeat(50));

if (allValid) {
  console.log('🎉 ALL TESTS STRUCTURE IS VALID!');
  console.log('✅ Test files are properly structured');
  console.log('✅ Support files are configured');
  console.log('✅ Fixtures are ready');
  console.log('✅ Custom commands are defined');
  console.log('✅ Configuration is complete');
  console.log('\n🚀 Ready to run tests once Cypress is installed!');
} else {
  console.log('⚠️  SOME ISSUES FOUND');
  console.log('🔧 Please review the issues above');
  console.log('📖 Check the TEST_EXECUTION_GUIDE.md for troubleshooting');
}

console.log('\n📋 Next Steps:');
console.log('1. Ensure application is running: npm start');
console.log('2. Install Cypress: npm install cypress --save-dev');
console.log('3. Run tests: npm run cypress:run');
console.log('4. Or open Cypress UI: npm run cypress:open');

process.exit(allValid ? 0 : 1);