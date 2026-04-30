#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

/**
 * Generate comprehensive test reports for documentation
 */
class TestReportGenerator {
  constructor() {
    this.reportsDir = path.join(__dirname, '..', 'reports');
    this.coverageDir = path.join(__dirname, '..', 'coverage');
    this.docsDir = path.join(__dirname, '..', 'docs', '_build', 'html');
    this.testResultsDir = path.join(__dirname, '..', 'test-results');
    
    // Ensure directories exist
    this.ensureDirectories();
  }

  ensureDirectories() {
    const dirs = [this.reportsDir, this.testResultsDir, path.join(this.docsDir, 'test-reports')];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async generateReports() {
    console.log('🧪 Generating test reports...');
    
    try {
      // Parse JUnit XML results
      const junitReport = await this.parseJUnitReport();
      
      // Parse coverage report
      const coverageReport = await this.parseCoverageReport();
      
      // Generate HTML report
      const htmlReport = this.generateHTMLReport(junitReport, coverageReport);
      
      // Generate JSON summary
      const jsonSummary = this.generateJSONSummary(junitReport, coverageReport);
      
      // Write reports
      await this.writeReports(htmlReport, jsonSummary);
      
      // Copy coverage reports to docs
      await this.copyCoverageToocs();
      
      console.log('✅ Test reports generated successfully!');
      
    } catch (error) {
      console.error('❌ Error generating test reports:', error);
      process.exit(1);
    }
  }

  async parseJUnitReport() {
    const junitPath = path.join(this.reportsDir, 'junit', 'js-test-results.xml');
    
    if (!fs.existsSync(junitPath)) {
      console.warn('⚠️  JUnit report not found, using mock data');
      return { testsuites: { testsuite: [] } };
    }

    const xmlContent = fs.readFileSync(junitPath, 'utf8');
    const parser = new xml2js.Parser();
    return await parser.parseStringPromise(xmlContent);
  }

  async parseCoverageReport() {
    const coveragePath = path.join(this.coverageDir, 'coverage-final.json');
    
    if (!fs.existsSync(coveragePath)) {
      console.warn('⚠️  Coverage report not found');
      return {};
    }

    return JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
  }

  generateHTMLReport(junitReport, coverageReport) {
    const testSuites = junitReport.testsuites?.testsuite || [];
    const totalTests = testSuites.reduce((sum, suite) => sum + parseInt(suite.$.tests || 0), 0);
    const failedTests = testSuites.reduce((sum, suite) => sum + parseInt(suite.$.failures || 0), 0);
    const passedTests = totalTests - failedTests;
    
    // Calculate coverage summary
    const coverageSummary = this.calculateCoverageSummary(coverageReport);
    
    const timestamp = new Date().toISOString();
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LUStores Test Report</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            background-color: #f5f5f5; 
        }
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            background: white; 
            padding: 20px; 
            border-radius: 8px; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #e0e0e0; 
            padding-bottom: 20px; 
        }
        .summary { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 20px; 
            margin-bottom: 30px; 
        }
        .card { 
            background: #f8f9fa; 
            padding: 20px; 
            border-radius: 6px; 
            text-align: center;
            border-left: 4px solid #007bff;
        }
        .card.success { border-left-color: #28a745; }
        .card.warning { border-left-color: #ffc107; }
        .card.danger { border-left-color: #dc3545; }
        .metric { font-size: 2em; font-weight: bold; color: #333; }
        .label { color: #666; margin-top: 5px; }
        .test-suites { margin-top: 30px; }
        .test-suite { 
            background: #f8f9fa; 
            margin: 10px 0; 
            padding: 15px; 
            border-radius: 6px;
            border-left: 4px solid #007bff;
        }
        .test-suite.failed { border-left-color: #dc3545; }
        .coverage-bar {
            width: 100%;
            height: 20px;
            background: #e0e0e0;
            border-radius: 10px;
            overflow: hidden;
            margin: 5px 0;
        }
        .coverage-fill {
            height: 100%;
            background: linear-gradient(90deg, #28a745, #ffc107, #dc3545);
        }
        .timestamp { 
            text-align: center; 
            color: #666; 
            margin-top: 30px; 
            font-size: 0.9em; 
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0; 
        }
        th, td { 
            padding: 12px; 
            text-align: left; 
            border-bottom: 1px solid #ddd; 
        }
        th { 
            background-color: #f2f2f2; 
            font-weight: bold; 
        }
        .pass { color: #28a745; font-weight: bold; }
        .fail { color: #dc3545; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 LUStores Test Report</h1>
            <p>Comprehensive testing results for the University Inventory System</p>
        </div>

        <div class="summary">
            <div class="card ${totalTests > 0 && failedTests === 0 ? 'success' : failedTests > 0 ? 'danger' : 'warning'}">
                <div class="metric">${totalTests}</div>
                <div class="label">Total Tests</div>
            </div>
            <div class="card success">
                <div class="metric">${passedTests}</div>
                <div class="label">Passed</div>
            </div>
            <div class="card ${failedTests > 0 ? 'danger' : 'success'}">
                <div class="metric">${failedTests}</div>
                <div class="label">Failed</div>
            </div>
            <div class="card ${coverageSummary.statements >= 70 ? 'success' : coverageSummary.statements >= 50 ? 'warning' : 'danger'}">
                <div class="metric">${coverageSummary.statements}%</div>
                <div class="label">Coverage</div>
            </div>
        </div>

        <div class="test-suites">
            <h2>📋 Test Suites</h2>
            ${testSuites.map(suite => `
                <div class="test-suite ${suite.$.failures > 0 ? 'failed' : ''}">
                    <h3>${suite.$.name || 'Unnamed Suite'}</h3>
                    <p><strong>Tests:</strong> ${suite.$.tests} | <strong>Time:</strong> ${parseFloat(suite.$.time || 0).toFixed(2)}s</p>
                    ${suite.testcase ? this.generateTestCaseTable(suite.testcase) : '<p>No test cases found</p>'}
                </div>
            `).join('')}
        </div>

        <div class="coverage-section">
            <h2>📊 Code Coverage</h2>
            <div class="coverage-details">
                <table>
                    <thead>
                        <tr>
                            <th>Metric</th>
                            <th>Percentage</th>
                            <th>Coverage</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Statements</td>
                            <td>${coverageSummary.statements}%</td>
                            <td><div class="coverage-bar"><div class="coverage-fill" style="width: ${coverageSummary.statements}%"></div></div></td>
                        </tr>
                        <tr>
                            <td>Branches</td>
                            <td>${coverageSummary.branches}%</td>
                            <td><div class="coverage-bar"><div class="coverage-fill" style="width: ${coverageSummary.branches}%"></div></div></td>
                        </tr>
                        <tr>
                            <td>Functions</td>
                            <td>${coverageSummary.functions}%</td>
                            <td><div class="coverage-bar"><div class="coverage-fill" style="width: ${coverageSummary.functions}%"></div></div></td>
                        </tr>
                        <tr>
                            <td>Lines</td>
                            <td>${coverageSummary.lines}%</td>
                            <td><div class="coverage-bar"><div class="coverage-fill" style="width: ${coverageSummary.lines}%"></div></div></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p><a href="./coverage/index.html" target="_blank">📈 View Detailed Coverage Report</a></p>
        </div>

        <div class="timestamp">
            Report generated on ${timestamp}
        </div>
    </div>
</body>
</html>`;
  }

  generateTestCaseTable(testCases) {
    if (!Array.isArray(testCases)) {
      testCases = [testCases];
    }

    return `
        <table>
            <thead>
                <tr>
                    <th>Test Case</th>
                    <th>Status</th>
                    <th>Time (s)</th>
                </tr>
            </thead>
            <tbody>
                ${testCases.map(testCase => `
                    <tr>
                        <td>${testCase.$.name || 'Unnamed Test'}</td>
                        <td class="${testCase.failure ? 'fail' : 'pass'}">${testCase.failure ? 'FAIL' : 'PASS'}</td>
                        <td>${parseFloat(testCase.$.time || 0).toFixed(3)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`;
  }

  calculateCoverageSummary(coverageReport) {
    if (!coverageReport || Object.keys(coverageReport).length === 0) {
      return { statements: 0, branches: 0, functions: 0, lines: 0 };
    }

    let totalStatements = 0, coveredStatements = 0;
    let totalBranches = 0, coveredBranches = 0;
    let totalFunctions = 0, coveredFunctions = 0;
    let totalLines = 0, coveredLines = 0;

    Object.values(coverageReport).forEach(file => {
      if (file.s) {
        totalStatements += Object.keys(file.s).length;
        coveredStatements += Object.values(file.s).filter(count => count > 0).length;
      }
      if (file.b) {
        totalBranches += Object.keys(file.b).length;
        coveredBranches += Object.values(file.b).filter(branches => branches.some(count => count > 0)).length;
      }
      if (file.f) {
        totalFunctions += Object.keys(file.f).length;
        coveredFunctions += Object.values(file.f).filter(count => count > 0).length;
      }
      if (file.l) {
        totalLines += Object.keys(file.l).length;
        coveredLines += Object.values(file.l).filter(count => count > 0).length;
      }
    });

    return {
      statements: Math.round((coveredStatements / totalStatements) * 100) || 0,
      branches: Math.round((coveredBranches / totalBranches) * 100) || 0,
      functions: Math.round((coveredFunctions / totalFunctions) * 100) || 0,
      lines: Math.round((coveredLines / totalLines) * 100) || 0,
    };
  }

  generateJSONSummary(junitReport, coverageReport) {
    const testSuites = junitReport.testsuites?.testsuite || [];
    const totalTests = testSuites.reduce((sum, suite) => sum + parseInt(suite.$.tests || 0), 0);
    const failedTests = testSuites.reduce((sum, suite) => sum + parseInt(suite.$.failures || 0), 0);
    const coverageSummary = this.calculateCoverageSummary(coverageReport);

    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests,
        passedTests: totalTests - failedTests,
        failedTests,
        coverage: coverageSummary
      },
      testSuites: testSuites.map(suite => ({
        name: suite.$.name,
        tests: parseInt(suite.$.tests || 0),
        failures: parseInt(suite.$.failures || 0),
        time: parseFloat(suite.$.time || 0)
      }))
    };
  }

  async writeReports(htmlReport, jsonSummary) {
    // Write HTML report to docs
    const htmlPath = path.join(this.docsDir, 'test-reports', 'index.html');
    fs.writeFileSync(htmlPath, htmlReport);

    // Write JSON summary
    const jsonPath = path.join(this.testResultsDir, 'summary.json');
    fs.writeFileSync(jsonPath, JSON.stringify(jsonSummary, null, 2));

    console.log(`📄 HTML report written to: ${htmlPath}`);
    console.log(`📄 JSON summary written to: ${jsonPath}`);
  }

  async copyCoverageToocs() {
    const coverageReportsDir = path.join(this.docsDir, 'test-reports', 'coverage');
    const sourceCoverageDir = this.coverageDir;

    if (fs.existsSync(sourceCoverageDir)) {
      // Copy entire coverage directory
      this.copyDirectoryRecursive(sourceCoverageDir, coverageReportsDir);
      console.log(`📁 Coverage reports copied to: ${coverageReportsDir}`);
    }
  }

  copyDirectoryRecursive(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const files = fs.readdirSync(src);
    files.forEach(file => {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);

      if (fs.statSync(srcPath).isDirectory()) {
        this.copyDirectoryRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    });
  }
}

// Run if called directly
if (require.main === module) {
  const generator = new TestReportGenerator();
  generator.generateReports().catch(console.error);
}

module.exports = TestReportGenerator;
