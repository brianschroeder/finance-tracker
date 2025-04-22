const fs = require('fs');
const path = require('path');

// Configure DB path
const dataDir = path.join(process.cwd(), 'data');
const betterSqlite3 = require('better-sqlite3');
const dbPath = path.join(dataDir, 'finance.db');

// Ensure data directory exists
function ensureDataDirExists() {
  try {
    if (!fs.existsSync(dataDir)) {
      console.log('Creating data directory...');
      fs.mkdirSync(dataDir, { recursive: true });
    }
  } catch (error) {
    console.error('Error creating data directory:', error);
    process.exit(1);
  }
}

// Initialize new database
function initializeDatabase() {
  ensureDataDirExists();
  
  console.log('Setting up a fresh database...');
  
  // Check if database file already exists
  const dbExists = fs.existsSync(dbPath);
  if (dbExists) {
    console.log('Database already exists! If you want to recreate it, please delete the existing database file first.');
    process.exit(0);
  }
  
  // Create new database
  const db = new betterSqlite3(dbPath);
  
  try {
    console.log('Creating tables...');
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Create income table
    db.prepare(`
      CREATE TABLE income (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payAmount REAL NOT NULL DEFAULT 0,
        payFrequency TEXT NOT NULL DEFAULT 'biweekly',
        workHoursPerWeek REAL NOT NULL DEFAULT 40,
        workDaysPerWeek REAL NOT NULL DEFAULT 5,
        bonusPercentage REAL NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    
    // Create savings plan table
    db.prepare(`
      CREATE TABLE savings_plan (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        currentAge INTEGER NOT NULL DEFAULT 30,
        retirementAge INTEGER NOT NULL DEFAULT 65,
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
        color TEXT NOT NULL DEFAULT '#000000',
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    
    // Create assets table
    db.prepare(`
      CREATE TABLE assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL DEFAULT CURRENT_DATE,
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
    
    // Create pay settings table
    db.prepare(`
      CREATE TABLE pay_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lastPayDate TEXT NOT NULL,
        frequency TEXT NOT NULL DEFAULT 'biweekly',
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    
    // Create budget categories table
    db.prepare(`
      CREATE TABLE budget_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        allocatedAmount REAL NOT NULL DEFAULT 0,
        color TEXT NOT NULL DEFAULT '#000000',
        isActive BOOLEAN NOT NULL DEFAULT 1,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    
    // Create transactions table
    db.prepare(`
      CREATE TABLE transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        categoryId INTEGER,
        name TEXT NOT NULL,
        amount REAL NOT NULL DEFAULT 0,
        notes TEXT,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (categoryId) REFERENCES budget_categories(id)
      )
    `).run();
    
    // Create recurring transactions table
    db.prepare(`
      CREATE TABLE recurring_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        amount REAL NOT NULL DEFAULT 0,
        dueDate INTEGER NOT NULL,
        isEssential BOOLEAN NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    
    // Create pending transactions table
    db.prepare(`
      CREATE TABLE pending_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        amount REAL NOT NULL DEFAULT 0,
        dueDate INTEGER NOT NULL,
        isEssential BOOLEAN NOT NULL DEFAULT 0,
        isCompleted BOOLEAN NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    
    // Create investments table
    db.prepare(`
      CREATE TABLE investments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticker TEXT NOT NULL,
        name TEXT NOT NULL,
        shares REAL NOT NULL DEFAULT 0,
        avgPrice REAL NOT NULL DEFAULT 0,
        currentPrice REAL,
        change REAL,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    
    console.log('All tables created successfully!');
    
    // Add sample data
    insertSampleData(db);
    
  } catch (error) {
    console.error('Error creating database schema:', error);
  } finally {
    db.close();
  }
}

// Insert sample data for new users
function insertSampleData(db) {
  console.log('Adding sample data...');
  
  try {
    // Sample income data
    db.prepare(`
      INSERT INTO income (payAmount, payFrequency, workHoursPerWeek, workDaysPerWeek, bonusPercentage)
      VALUES (2500, 'biweekly', 40, 5, 10)
    `).run();
    
    // Sample savings plan
    db.prepare(`
      INSERT INTO savings_plan (currentAge, retirementAge, currentSavings, yearlyContribution, yearlyBonus, annualReturn)
      VALUES (30, 65, 50000, 15000, 2000, 7)
    `).run();
    
    // Sample credit cards
    const sampleCards = [
      { name: 'Chase Sapphire', balance: 0, limit: 5000, color: '#2136d4' },
      { name: 'Amazon Prime', balance: 0, limit: 3500, color: '#d89013' }
    ];
    
    const insertCard = db.prepare(`
      INSERT INTO credit_cards (name, balance, "limit", color)
      VALUES (?, ?, ?, ?)
    `);
    
    sampleCards.forEach(card => {
      insertCard.run(card.name, card.balance, card.limit, card.color);
    });
    
    // Sample assets
    const today = new Date().toISOString().split('T')[0];
    db.prepare(`
      INSERT INTO assets (date, cash, stocks, interest, checking, retirement401k, houseFund, vacationFund, emergencyFund, totalAssets)
      VALUES (?, 10000, 20000, 5000, 3000, 40000, 15000, 5000, 10000, 108000)
    `).run(today);
    
    // Sample pay settings
    // Calculate a reasonable "last pay date" (nearest past Friday)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    const daysFromFriday = (dayOfWeek + 2) % 7; // +2 from Friday (5) gives us 0-indexed days since Friday
    const lastFriday = new Date(now);
    lastFriday.setDate(now.getDate() - daysFromFriday);
    const lastPayDate = lastFriday.toISOString().split('T')[0];
    
    db.prepare(`
      INSERT INTO pay_settings (lastPayDate, frequency)
      VALUES (?, 'biweekly')
    `).run(lastPayDate);
    
    // Sample budget categories
    const sampleCategories = [
      { name: 'Groceries', allocatedAmount: 300, color: '#4C9AFF' },
      { name: 'Dining Out', allocatedAmount: 200, color: '#F87171' },
      { name: 'Transportation', allocatedAmount: 150, color: '#38B2AC' },
      { name: 'Entertainment', allocatedAmount: 100, color: '#805AD5' },
      { name: 'Shopping', allocatedAmount: 150, color: '#ED8936' }
    ];
    
    const insertCategory = db.prepare(`
      INSERT INTO budget_categories (name, allocatedAmount, color)
      VALUES (?, ?, ?)
    `);
    
    sampleCategories.forEach(category => {
      insertCategory.run(category.name, category.allocatedAmount, category.color);
    });
    
    console.log('Sample data added successfully!');
  } catch (error) {
    console.error('Error adding sample data:', error);
  }
}

// Execute setup
initializeDatabase(); 