const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Path to .next directory
const nextDir = path.join(__dirname, '..', '.next');

console.log('Checking if .next directory exists...');
if (fs.existsSync(nextDir)) {
  console.log('.next directory found. Attempting to clean it.');
  
  try {
    // On Windows, avoid killing all node processes as that kills our script too
    // Instead just output a warning
    console.log('Warning: .next directory might be locked by another process.');
    
    // Use rimraf directly for better cleanup
    try {
      console.log('Removing .next directory...');
      execSync('rmdir /s /q ' + nextDir, { stdio: 'inherit' });
      console.log('.next directory successfully removed.');
    } catch (err) {
      console.error('Error removing .next directory with rmdir:', err.message);
      console.log('Build may proceed with partial cleanup.');
    }
  } catch (error) {
    console.error('Error during cleanup:', error.message);
  }
} else {
  console.log('.next directory does not exist. No cleanup needed.');
} 