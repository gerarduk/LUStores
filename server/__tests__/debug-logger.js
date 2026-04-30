const fs = require('fs');
const path = require('path');
const util = require('util');

// Ensure logs directory exists
const LOGS_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

const LOG_FILE = path.join(LOGS_DIR, 'test-debug.log');

// Clear the log file at startup
try {
  fs.writeFileSync(LOG_FILE, `=== Test Run Started: ${new Date().toISOString()} ===\n\n`);
} catch (error) {
  console.error('Failed to initialize log file:', error);
}

function log(...args) {
  try {
    const timestamp = new Date().toISOString();
    const message = args.map(arg => {
      if (arg instanceof Error) {
        return `${arg.message}\n${arg.stack}`;
      } else if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return util.inspect(arg, { depth: null, colors: false });
        }
      }
      return String(arg);
    }).join(' ');
    
    const logEntry = `[${timestamp}] ${message}\n`;
    
    // Log to console
    console.log(logEntry);
    
    // Append to log file
    fs.appendFileSync(LOG_FILE, logEntry, { flag: 'a' });
  } catch (error) {
    console.error('Error in logger:', error);
  }
}

// Export both default and named exports
module.exports = log;
module.exports.log = log;
