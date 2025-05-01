const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Path to .next directory
const nextDir = path.join(__dirname, '..', '.next');

console.log('Checking if .next directory exists...');
if (fs.existsSync(nextDir)) {
  console.log('.next directory found. Attempting to clean it.');
  
  try {
    console.log('Warning: .next directory might be locked by another process.');
    
    // Use platform-independent fs methods instead of shell commands
    try {
      console.log('Removing .next directory...');
      
      // Use recursive rm for Node.js 14+ or fallback for older versions
      if (fs.rm) {
        fs.rmSync(nextDir, { recursive: true, force: true });
      } else {
        // Fallback implementation
        const deleteFolderRecursive = function(path) {
          if (fs.existsSync(path)) {
            fs.readdirSync(path).forEach((file) => {
              const curPath = path + "/" + file;
              if (fs.lstatSync(curPath).isDirectory()) {
                deleteFolderRecursive(curPath);
              } else {
                fs.unlinkSync(curPath);
              }
            });
            fs.rmdirSync(path);
          }
        };
        deleteFolderRecursive(nextDir);
      }
      
      console.log('.next directory successfully removed.');
    } catch (err) {
      console.error('Error removing .next directory:', err.message);
      console.log('Build may proceed with partial cleanup.');
    }
  } catch (error) {
    console.error('Error during cleanup:', error.message);
  }
} else {
  console.log('.next directory does not exist. No cleanup needed.');
} 