#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to fix imports in a file
function fixImportsInFile(filePath, isRootLevel = false) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  if (isRootLevel) {
    // Fix relative imports for root level - all patterns
    const newContent = content.replace(/require\("\.\/([^"]+)"\)/g, 'require("./server/$1")');
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
    
    const newDynamicContent = content.replace(/import\("\.\/([^"]+)"\)/g, 'import("./server/$1")');
    if (newDynamicContent !== content) {
      content = newDynamicContent;
      modified = true;
    }
    
    const newImportStarContent = content.replace(/__importStar\(require\("\.\/([^"]+)"\)\)/g, '__importStar(require("./server/$1"))');
    if (newImportStarContent !== content) {
      content = newImportStarContent;
      modified = true;
    }
    
    const newPromiseImportContent = content.replace(/Promise\.resolve\(\)\.then\(\(\) => __importStar\(require\("\.\/([^"]+)"\)\)\)/g, 'Promise.resolve().then(() => __importStar(require("./server/$1")))');
    if (newPromiseImportContent !== content) {
      content = newPromiseImportContent;
      modified = true;
    }
  }

  // Fix @shared imports for all files - all patterns
  const sharedRequireContent = content.replace(/require\("@shared\/([^"]+)"\)/g, (match, p1) => {
    if (isRootLevel) {
      return `require("./shared/${p1}")`;
    } else {
      return `require("../shared/${p1}")`;
    }
  });
  
  if (sharedRequireContent !== content) {
    content = sharedRequireContent;
    modified = true;
  }

  const sharedImportContent = content.replace(/import\("@shared\/([^"]+)"\)/g, (match, p1) => {
    if (isRootLevel) {
      return `import("./shared/${p1}")`;
    } else {
      return `import("../shared/${p1}")`;
    }
  });
  
  if (sharedImportContent !== content) {
    content = sharedImportContent;
    modified = true;
  }

  const sharedImportStarContent = content.replace(/__importStar\(require\("@shared\/([^"]+)"\)\)/g, (match, p1) => {
    if (isRootLevel) {
      return `__importStar(require("./shared/${p1}"))`;
    } else {
      return `__importStar(require("../shared/${p1}"))`;
    }
  });
  
  if (sharedImportStarContent !== content) {
    content = sharedImportStarContent;
    modified = true;
  }

  const sharedPromiseImportContent = content.replace(/Promise\.resolve\(\)\.then\(\(\) => __importStar\(require\("@shared\/([^"]+)"\)\)\)/g, (match, p1) => {
    if (isRootLevel) {
      return `Promise.resolve().then(() => __importStar(require("./shared/${p1}")))`;
    } else {
      return `Promise.resolve().then(() => __importStar(require("../shared/${p1}")))`;
    }
  });
  
  if (sharedPromiseImportContent !== content) {
    content = sharedPromiseImportContent;
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed imports in ${filePath}`);
  }
}

// Read the server index.js file
const serverIndexPath = path.join(__dirname, '../dist/server/index.js');
const rootIndexPath = path.join(__dirname, '../dist/index.js');

if (!fs.existsSync(serverIndexPath)) {
  console.error('Server index.js not found at:', serverIndexPath);
  process.exit(1);
}

let content = fs.readFileSync(serverIndexPath, 'utf8');

// Fix import paths for the root level - handle various patterns
// 1. Standard require calls - handle both single and double quotes
content = content.replace(/require\("\.\/([^"\/]+)"\)/g, (match, p1) => {
  if (!p1.includes('/')) {
    return `require("./server/${p1}")`;
  }
  return match;
});

content = content.replace(/require\('\.\/([^'\/]+)'\)/g, (match, p1) => {
  if (!p1.includes('/')) {
    return `require('./server/${p1}')`;
  }
  return match;
});

// 2. Dynamic imports: import('./module') - handle both single and double quotes
content = content.replace(/import\("\.\/([^"\/]+)"\)/g, (match, p1) => {
  if (!p1.includes('/')) {
    return `import("./server/${p1}")`;
  }
  return match;
});

content = content.replace(/import\('\.\/([^'\/]+)'\)/g, (match, p1) => {
  if (!p1.includes('/')) {
    return `import('./server/${p1}')`;
  }
  return match;
});

// 3. TypeScript compiled dynamic imports with Promise.resolve():
//    Promise.resolve().then(() => __importStar(require('./module')))
content = content.replace(/Promise\.resolve\(\)\.then\(\(\) => __importStar\(require\('\.\/([^'\/]+)'\)\)\)/g, (match, p1) => {      
  if (!p1.includes('/')) {
    return `Promise.resolve().then(() => __importStar(require('./server/${p1}')))`;
  }
  return match;
});// 4. Direct __importStar pattern (fallback) - handle both single and double quotes
content = content.replace(/__importStar\(require\("\.\/([^"\/]+)"\)\)/g, (match, p1) => {
  if (!p1.includes('/')) {
    return `__importStar(require("./server/${p1}"))`;
  }
  return match;
});

content = content.replace(/__importStar\(require\('\.\/([^'\/]+)'\)\)/g, (match, p1) => {
  if (!p1.includes('/')) {
    return `__importStar(require('./server/${p1}'))`;
  }
  return match;
});

// Fix @shared imports for all patterns
content = content.replace(/require\("@shared\/([^"]+)"\)/g, 'require("./shared/$1")');
content = content.replace(/import\("@shared\/([^"]+)"\)/g, 'import("./shared/$1")');
content = content.replace(/__importStar\(require\("@shared\/([^"]+)"\)\)/g, '__importStar(require("./shared/$1"))');
content = content.replace(/Promise\.resolve\(\)\.then\(\(\) => __importStar\(require\("@shared\/([^"]+)"\)\)\)/g, 'Promise.resolve().then(() => __importStar(require("./shared/$1")))');

// Write the fixed content to the root index.js
fs.writeFileSync(rootIndexPath, content);
console.log('Fixed import paths in dist/index.js');

// Debug: Show the specific line that should be fixed
console.log('Checking for dbInit imports in fixed file:');
const fixedContent = fs.readFileSync(rootIndexPath, 'utf8');
const dbInitLines = fixedContent.split('\n').filter(line => line.includes('dbInit'));
dbInitLines.forEach((line, index) => {
  console.log(`Line: ${line.trim()}`);
});

// Also check that the dbInit module exists
const dbInitPath = path.join(__dirname, '../dist/server/dbInit.js');
if (fs.existsSync(dbInitPath)) {
  console.log('✅ dbInit.js found at:', dbInitPath);
} else {
  console.error('❌ dbInit.js NOT found at:', dbInitPath);
  // List what files ARE in the server directory
  const serverDir = path.join(__dirname, '../dist/server');
  if (fs.existsSync(serverDir)) {
    const files = fs.readdirSync(serverDir);
    console.log('Files in dist/server:', files);
  } else {
    console.error('dist/server directory does not exist');
  }
}

// Fix @shared imports in all server files
const serverDir = path.join(__dirname, '../dist/server');
const serverFiles = fs.readdirSync(serverDir).filter(file => file.endsWith('.js'));

serverFiles.forEach(file => {
  const filePath = path.join(serverDir, file);
  fixImportsInFile(filePath, false);
});
