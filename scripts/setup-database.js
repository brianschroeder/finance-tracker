#!/usr/bin/env node

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { format } = require('date-fns');

// Ensure the data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'finance.db');

// Check if database already exists
if (fs.existsSync(dbPath)) {
  console.log('Database already exists. To recreate it, delete the file first.');
  console.log(`Path: ${dbPath}`);
  process.exit(0);
}

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('Creating database schema...');

// Create assets table
db.prepare(`
  CREATE TABLE assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    cash REAL NOT NULL DEFAULT 0,
    stocks REAL NOT NULL DEFAULT 0,
    interest REAL NOT NULL DEFAULT 0,
    checking REAL NOT NULL DEFAULT 0,
    retirement401k REAL NOT NULL DEFAULT 0,
    houseFund REAL NOT NULL DEFAULT 0,
    vacationFund REAL NOT NULL DEFAULT 0,
    emergencyFund REAL NOT NULL DEFAULT 0,
    totalAssets REAL NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// Create recurring transactions table
db.prepare(`
  CREATE TABLE recurring_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    dueDate INTEGER NOT NULL, /* Day of month (1-31) */
    isEssential INTEGER NOT NULL DEFAULT 0, /* Boolean 0 or 1 */
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// Create pay settings table
db.prepare(`
  CREATE TABLE pay_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lastPayDate TEXT NOT NULL,
    frequency TEXT NOT NULL, /* 'weekly' or 'biweekly' */
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// Create completed transactions table
db.prepare(`
  CREATE TABLE completed_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recurringTransactionId INTEGER NOT NULL,
    completedDate TEXT NOT NULL,
    payPeriodStart TEXT NOT NULL,
    payPeriodEnd TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recurringTransactionId) REFERENCES recurring_transactions(id) ON DELETE CASCADE
  )
`).run();

// Create pending transaction overrides table
db.prepare(`
  CREATE TABLE pending_transaction_overrides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recurringTransactionId INTEGER NOT NULL,
    amount REAL NOT NULL,
    payPeriodStart TEXT NOT NULL,
    payPeriodEnd TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recurringTransactionId) REFERENCES recurring_transactions(id) ON DELETE CASCADE
  )
`).run();

// Create budget categories table
db.prepare(`
  CREATE TABLE budget_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    allocatedAmount REAL NOT NULL DEFAULT 0,
    color TEXT NOT NULL DEFAULT '#3B82F6', /* Default blue color */
    isActive INTEGER NOT NULL DEFAULT 1, /* Boolean 0 or 1 */
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// Create transactions table
db.prepare(`
  CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL, /* YYYY-MM-DD format */
    categoryId INTEGER,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    cashBack REAL,
    notes TEXT,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoryId) REFERENCES budget_categories(id) ON DELETE SET NULL
  )
`).run();

// Create investments table
db.prepare(`
  CREATE TABLE investments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    shares REAL NOT NULL,
    avgPrice REAL NOT NULL,
    currentPrice REAL,
    prevDayPrice REAL,
    lastUpdated TEXT,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// Create investment snapshots table for history
db.prepare(`
  CREATE TABLE investment_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    totalValue REAL NOT NULL,
    totalCost REAL NOT NULL,
    totalGainLoss REAL NOT NULL,
    dayChange REAL NOT NULL,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// Create income data table
db.prepare(`
  CREATE TABLE income_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payAmount REAL NOT NULL DEFAULT 0,
    payFrequency TEXT NOT NULL DEFAULT 'biweekly',
    workHoursPerWeek REAL NOT NULL DEFAULT 40,
    workDaysPerWeek INTEGER NOT NULL DEFAULT 5,
    bonusPercentage REAL NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// Create savings plan table
db.prepare(`
  CREATE TABLE savings_plan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    currentAge INTEGER NOT NULL,
    retirementAge INTEGER NOT NULL,
    currentSavings REAL NOT NULL DEFAULT 0,
    yearlyContribution REAL NOT NULL DEFAULT 0,
    yearlyBonus REAL NOT NULL DEFAULT 0,
    annualReturn REAL NOT NULL DEFAULT 7,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// Create credit cards table
db.prepare(`
  CREATE TABLE credit_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    balance REAL NOT NULL DEFAULT 0,
    "limit" REAL NOT NULL DEFAULT 0,
    color TEXT NOT NULL DEFAULT '#4F46E5',
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// Set up initial pay settings with today's date
const today = new Date();
const formattedDate = format(today, 'yyyy-MM-dd');

db.prepare(`
  INSERT INTO pay_settings (lastPayDate, frequency)
  VALUES (?, 'biweekly')
`).run(formattedDate);

console.log('Database initialized successfully!');
console.log('Created tables:');
console.log('- assets');
console.log('- recurring_transactions');
console.log('- pay_settings');
console.log('- completed_transactions');
console.log('- pending_transaction_overrides');
console.log('- budget_categories');
console.log('- transactions');
console.log('- investments');
console.log('- investment_snapshots');
console.log('- income_data');
console.log('- savings_plan');
console.log('- credit_cards');
console.log('');
console.log('Initial pay settings created with today\'s date.');
console.log('');
console.log('You can now set up your financial data through the app interface.'); 