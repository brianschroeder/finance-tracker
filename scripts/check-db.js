#!/usr/bin/env node

/**
 * This utility script checks the database for foreign key issues and other integrity problems
 * and provides options to fix them.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Create readline interface for user interaction
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Ensure the data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  console.error('Data directory does not exist. Please run the app first to initialize the database.');
  process.exit(1);
}

// Open the database
const dbPath = path.join(dataDir, 'finance.db');
console.log(`Opening database at: ${dbPath}`);

let db;
try {
  db = new Database(dbPath);
  console.log('Database opened successfully');
} catch (error) {
  console.error('Failed to open database:', error);
  process.exit(1);
}

// Main function to check database integrity
async function checkDatabase() {
  console.log('\n=== Database Integrity Check ===');
  
  // Check integrity using SQLite's built-in pragma
  const integrityCheck = db.pragma('integrity_check');
  console.log('Integrity check result:', integrityCheck);
  
  // Check foreign key constraints
  const foreignKeyCheck = db.pragma('foreign_key_check');
  if (foreignKeyCheck.length === 0) {
    console.log('Foreign key check passed: No violations found.');
  } else {
    console.error('Foreign key violations found:', foreignKeyCheck);
    
    const answer = await askQuestion('Would you like to fix these foreign key issues? (y/n): ');
    if (answer.toLowerCase() === 'y') {
      await fixForeignKeyIssues(foreignKeyCheck);
    }
  }
  
  // Check for recurring transactions with invalid category references
  console.log('\n=== Checking Recurring Transactions ===');
  await checkRecurringTransactions();
  
  // Close the database and exit
  closeAndExit();
}

// Function to fix foreign key issues
async function fixForeignKeyIssues(violations) {
  console.log('\nFixing foreign key violations...');
  
  // Temporarily disable foreign key constraints
  db.pragma('foreign_keys = OFF');
  
  try {
    for (const violation of violations) {
      console.log(`Fixing violation in table ${violation.table} with rowid ${violation.rowid}`);
      
      // Get foreign key column information
      const foreignKeys = db.pragma(`foreign_key_list(${violation.table})`);
      
      if (foreignKeys && foreignKeys.length > 0) {
        // Find the specific foreign key for this violation
        const foreignKeyInfo = foreignKeys.find(fk => 
          fk.table === violation.parent || // Match on parent table
          (violation.parent && fk.table === violation.parent.split('.')[0]) // Handle qualified parent names
        );
        
        if (foreignKeyInfo) {
          console.log(`Setting ${violation.table}.${foreignKeyInfo.from} to NULL for rowid ${violation.rowid}`);
          
          const updateQuery = `UPDATE ${violation.table} SET ${foreignKeyInfo.from} = NULL WHERE rowid = ?`;
          console.log(`Executing: ${updateQuery} with rowid ${violation.rowid}`);
          
          const result = db.prepare(updateQuery).run(violation.rowid);
          console.log(`Update result: ${result.changes} row(s) affected`);
        } else {
          console.log(`Could not identify specific foreign key for violation in table ${violation.table}`);
          
          // Get all column names
          const tableInfo = db.prepare(`PRAGMA table_info(${violation.table})`).all();
          console.log(`Table columns for ${violation.table}:`, tableInfo.map(col => col.name));
          
          // Ask for manual column selection
          const columnNames = tableInfo.map(col => col.name).join(', ');
          const answer = await askQuestion(`Enter column name to set NULL (options: ${columnNames}): `);
          
          if (answer && tableInfo.some(col => col.name === answer)) {
            console.log(`Setting ${violation.table}.${answer} to NULL for rowid ${violation.rowid}`);
            const result = db.prepare(`UPDATE ${violation.table} SET ${answer} = NULL WHERE rowid = ?`).run(violation.rowid);
            console.log(`Update result: ${result.changes} row(s) affected`);
          } else {
            console.log('Invalid column name or operation skipped');
          }
        }
      } else {
        console.log(`No foreign keys defined for table ${violation.table}`);
      }
    }
    
    console.log('Fixed foreign key violations');
  } catch (error) {
    console.error('Error fixing foreign key violations:', error);
  } finally {
    // Re-enable foreign key constraints
    db.pragma('foreign_keys = ON');
  }
}

// Function to check recurring transactions
async function checkRecurringTransactions() {
  // Check if tables exist first
  const recurringTransactionsTable = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='recurring_transactions'
  `).get();
  
  const recurringCategoriesTable = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='recurring_categories'
  `).get();
  
  if (!recurringTransactionsTable || !recurringCategoriesTable) {
    console.log('Recurring transactions or categories tables do not exist.');
    return;
  }
  
  // Get all recurring transactions
  const transactions = db.prepare(`
    SELECT * FROM recurring_transactions WHERE categoryId IS NOT NULL
  `).all();
  
  console.log(`Found ${transactions.length} recurring transactions with categories.`);
  
  // Get all valid category IDs
  const categories = db.prepare(`SELECT id FROM recurring_categories`).all();
  const validCategoryIds = new Set(categories.map(cat => cat.id));
  
  // Find transactions with invalid category references
  const invalidTransactions = transactions.filter(
    t => !validCategoryIds.has(t.categoryId)
  );
  
  if (invalidTransactions.length > 0) {
    console.log(`Found ${invalidTransactions.length} transactions with invalid category references:`, invalidTransactions);
    
    const answer = await askQuestion('Would you like to fix these invalid category references? (y/n): ');
    if (answer.toLowerCase() === 'y') {
      await fixInvalidCategoryReferences(invalidTransactions);
    }
  } else {
    console.log('All recurring transactions have valid category references.');
  }
}

// Function to fix invalid category references
async function fixInvalidCategoryReferences(invalidTransactions) {
  console.log('\nFixing invalid category references...');
  
  // Temporarily disable foreign key constraints
  db.pragma('foreign_keys = OFF');
  
  try {
    for (const tx of invalidTransactions) {
      console.log(`Fixing transaction ID ${tx.id} (${tx.name}): Invalid categoryId ${tx.categoryId}`);
      const result = db.prepare(`
        UPDATE recurring_transactions
        SET categoryId = NULL
        WHERE id = ?
      `).run(tx.id);
      console.log(`Result: ${result.changes} row(s) updated`);
    }
    
    console.log('Fixed invalid category references');
  } catch (error) {
    console.error('Error fixing invalid category references:', error);
  } finally {
    // Re-enable foreign key constraints
    db.pragma('foreign_keys = ON');
  }
}

// Helper function to ask a question and get a response
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Function to close database and exit
function closeAndExit() {
  try {
    console.log('\nClosing database...');
    db.close();
    console.log('Database connection closed.');
    rl.close();
  } catch (error) {
    console.error('Error closing database:', error);
  }
}

// Start the database check
checkDatabase().catch(error => {
  console.error('Error during database check:', error);
  closeAndExit();
}); 