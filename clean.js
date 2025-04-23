const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

function deleteFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file) => {
      const curPath = path.join(folderPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // Recursive call for directories
        deleteFolderRecursive(curPath);
      } else {
        // Delete file
        try {
          fs.unlinkSync(curPath);
        } catch (err) {
          console.error(`Error deleting file ${curPath}:`, err);
        }
      }
    });
    
    try {
      fs.rmdirSync(folderPath);
      console.log(`Successfully deleted folder: ${folderPath}`);
    } catch (err) {
      console.error(`Error deleting folder ${folderPath}:`, err);
    }
  }
}

// Delete .next directory
const nextDir = path.join(__dirname, '.next');
console.log(`Attempting to delete ${nextDir}`);
deleteFolderRecursive(nextDir);

// Run build
console.log('Starting build...');
exec('npm run build', (error, stdout, stderr) => {
  if (error) {
    console.error(`exec error: ${error}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
  if (stderr) {
    console.error(`stderr: ${stderr}`);
  }
}); 