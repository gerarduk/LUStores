// Simple Jest reporter to log all test output
class CustomReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options;
  }

  onRunStart() {
    console.log('=== Starting test run ===');
  }

  onTestStart(test) {
    console.log(`\n=== Starting test: ${test.path} ===`);
  }

  onTestResult(test, testResult) {
    console.log(`\n=== Test result for: ${test.path} ===`);
    console.log(`Status: ${testResult.numFailingTests > 0 ? 'FAILED' : 'PASSED'}`);
    
    if (testResult.failureMessage) {
      console.log('Failure Message:', testResult.failureMessage);
    }
    
    if (testResult.console) {
      console.log('Console Output:');
      testResult.console.forEach(({ message, origin }) => {
        console.log(`[${origin}] ${message}`);
      });
    }
  }
}

module.exports = CustomReporter;
