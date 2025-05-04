// Add pending and pendingTipAmount columns to transactions table if they don't exist
const db = require('better-sqlite3')('./data/finance.db');

try {
  // Check if the pending column exists in the transactions table
  const pendingColumnExists = db.prepare(`
    PRAGMA table_info(transactions)
  `).all().some(column => column.name === 'pending');

  // If the pending column doesn't exist, add it
  if (!pendingColumnExists) {
    console.log('Adding pending column to transactions table...');
    
    db.prepare(`
      ALTER TABLE transactions 
      ADD COLUMN pending INTEGER NOT NULL DEFAULT 0
    `).run();
    
    console.log('Pending column added successfully.');
  } else {
    console.log('Pending column already exists in transactions table.');
  }

  // Check if the pendingTipAmount column exists in the transactions table
  const pendingTipColumnExists = db.prepare(`
    PRAGMA table_info(transactions)
  `).all().some(column => column.name === 'pendingTipAmount');

  // If the pendingTipAmount column doesn't exist, add it
  if (!pendingTipColumnExists) {
    console.log('Adding pendingTipAmount column to transactions table...');
    
    db.prepare(`
      ALTER TABLE transactions 
      ADD COLUMN pendingTipAmount REAL DEFAULT 0
    `).run();
    
    console.log('PendingTipAmount column added successfully.');
  } else {
    console.log('PendingTipAmount column already exists in transactions table.');
  }
} catch (error) {
  console.error('Error updating database schema:', error);
} finally {
  db.close();
} 