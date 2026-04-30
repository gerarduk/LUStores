#!/usr/bin/env node

/**
 * Comprehensive Playwright Test Runner
 * Runs all E2E tests with proper sequencing and reporting
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test suites in order of execution
const testSuites = [
  {
    name: 'Core Functionality Tests',
    files: [
      'tests/e2e/inventory.spec.ts',
      'tests/e2e/sales.spec.ts',
      'tests/e2e/dashboard.spec.ts'
    ]
  },
  {
    name: 'UI Component Tests',
    files: [
      'tests/e2e/modals-dialogs.spec.ts',
      'tests/e2e/navigation-ui.spec.ts',
      'tests/e2e/comprehensive-buttons.spec.ts'
    ]
  },
  {
    name: 'Form and Validation Tests',
    files: [
      'tests/e2e/form-validation.spec.ts'
    ]
  },
  {
    name: 'Integration and Edge Case Tests',
    files: [
      'tests/e2e/full-stack.spec.ts',
      'tests/e2e/accessibility-edge-cases.spec.ts'
    ]
  }
];

// Results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let skippedTests = 0;
const results = [];

console.log('🚀 Starting Comprehensive Playwright E2E Test Suite');
console.log('=' .repeat(60));

async function runTestSuite(suite) {
  console.log(`\n📋 Running ${suite.name}...`);
  console.log('-'.repeat(40));
  
  for (const testFile of suite.files) {
    const testPath = path.join(process.cwd(), testFile);
    
    // Check if test file exists
    if (!fs.existsSync(testPath)) {
      console.log(`⚠️  Skipping ${testFile} - file not found`);
      skippedTests++;
      continue;
    }
    
    console.log(`🧪 Running ${testFile}...`);
    
    try {
      const result = await runPlaywrightTest(testFile);
      results.push({
        suite: suite.name,
        file: testFile,
        status: result.success ? 'PASSED' : 'FAILED',
        duration: result.duration,
        error: result.error
      });
      
      if (result.success) {
        console.log(`✅ ${testFile} - PASSED (${result.duration}ms)`);
        passedTests++;
      } else {
        console.log(`❌ ${testFile} - FAILED (${result.duration}ms)`);
        console.log(`   Error: ${result.error}`);
        failedTests++;
      }
      
      totalTests++;
    } catch (error) {
      console.log(`💥 ${testFile} - ERROR: ${error.message}`);
      results.push({
        suite: suite.name,
        file: testFile,
        status: 'ERROR',
        duration: 0,
        error: error.message
      });
      failedTests++;
      totalTests++;
    }
  }
}

function runPlaywrightTest(testFile) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const args = ['test', testFile, '--reporter=json'];
    
    // Add CI-specific options if running in CI
    if (process.env.CI) {
      args.push('--workers=1', '--retries=2');
    }
    
    const child = spawn('npx', ['playwright', ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      const success = code === 0;
      
      resolve({
        success,
        duration,
        error: success ? null : stderr || stdout || `Exit code: ${code}`
      });
    });
    
    child.on('error', (error) => {
      const duration = Date.now() - startTime;
      resolve({
        success: false,
        duration,
        error: error.message
      });
    });
  });
}

function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 COMPREHENSIVE TEST RESULTS');
  console.log('='.repeat(60));
  
  console.log(`\n📈 Summary:`);
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Passed: ${passedTests} ✅`);
  console.log(`   Failed: ${failedTests} ❌`);
  console.log(`   Skipped: ${skippedTests} ⚠️`);
  console.log(`   Success Rate: ${totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0}%`);
  
  console.log(`\n📋 Detailed Results:`);
  results.forEach((result, index) => {
    const status = result.status === 'PASSED' ? '✅' : result.status === 'FAILED' ? '❌' : '💥';
    console.log(`   ${index + 1}. ${status} ${result.file} (${result.duration}ms)`);
    if (result.error) {
      console.log(`      Error: ${result.error.substring(0, 100)}...`);
    }
  });
  
  // Write detailed report to file
  const reportPath = path.join(process.cwd(), 'test-results', 'comprehensive-report.json');
  const reportDir = path.dirname(reportPath);
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      skipped: skippedTests,
      successRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0
    },
    results: results
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  
  return failedTests === 0;
}

async function main() {
  try {
    // Run all test suites
    for (const suite of testSuites) {
      await runTestSuite(suite);
    }
    
    // Generate and display final report
    const success = generateReport();
    
    console.log('\n' + '='.repeat(60));
    if (success) {
      console.log('🎉 All comprehensive tests completed successfully!');
      process.exit(0);
    } else {
      console.log('💥 Some tests failed. Please review the results above.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Fatal error running comprehensive tests:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⚠️  Test run interrupted by user');
  generateReport();
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Test run terminated');
  generateReport();
  process.exit(1);
});

// Run the comprehensive test suite
main();
