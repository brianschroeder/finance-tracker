#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to ask a question and get a response
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Path to database file
const dbPath = path.join(process.cwd(), 'data', 'finance.db');

async function init() {
  console.log('\n========== Finance Tracker Initialization ==========\n');
  console.log('This script will help you set up your finance tracker app.\n');

  // Check if database exists
  const dbExists = fs.existsSync(dbPath);
  
  if (dbExists) {
    console.log('A database already exists at', dbPath);
    const confirmReset = await askQuestion('Do you want to reset the database? (yes/no): ');
    
    if (confirmReset.toLowerCase() === 'yes') {
      try {
        fs.unlinkSync(dbPath);
        console.log('Existing database deleted successfully.');
      } catch (error) {
        console.error('Error deleting database:', error.message);
        rl.close();
        return;
      }
    } else {
      console.log('Database reset cancelled. Existing database will be used.');
      rl.close();
      return;
    }
  }
  
  // Create new database
  console.log('\nCreating a fresh database...');
  try {
    execSync('node scripts/setup-database.js', { stdio: 'inherit' });
    console.log('Database created successfully!');
  } catch (error) {
    console.error('Error creating database:', error.message);
    rl.close();
    return;
  }
  
  // Finished
  console.log('\n========== Initialization Complete ==========\n');
  console.log('Your finance tracker is ready to use!');
  console.log('\nNext steps:');
  console.log('1. Run "npm run dev" to start the development server');
  console.log('2. Open http://localhost:3500 in your browser');
  console.log('3. Set up your financial data through the application interface');
  
  rl.close();
}

init().catch(error => {
  console.error('Error during initialization:', error);
  rl.close();
}); 