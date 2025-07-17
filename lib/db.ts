import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure the data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'finance.db');
let db: Database.Database;

// Initialize the database
export function getDb(): Database.Database {
  if (!db) {
    db = new Database(dbPath);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    initDb();
  }
  
  return db;
}

interface ColumnInfo {
  name: string;
  [key: string]: any;
}

// Initialize the database schema
function initDb() {
  const assetsTableExists = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='assets'
  `).get();
  
  if (!assetsTableExists) {
    // Create assets table without legacy field names
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
  } else {
    // Add new columns if they don't exist
    const columns = db.prepare(`PRAGMA table_info(assets)`).all() as ColumnInfo[];
    const columnNames = columns.map(col => col.name);
    
    if (!columnNames.includes('cash')) {
      db.prepare(`ALTER TABLE assets ADD COLUMN cash REAL NOT NULL DEFAULT 0`).run();
    }
    
    if (!columnNames.includes('stocks')) {
      db.prepare(`ALTER TABLE assets ADD COLUMN stocks REAL NOT NULL DEFAULT 0`).run();
    }
    
    if (!columnNames.includes('interest')) {
      db.prepare(`ALTER TABLE assets ADD COLUMN interest REAL NOT NULL DEFAULT 0`).run();
    }
    
    // Check for emergencyFund column and add it if it doesn't exist
    if (!columnNames.includes('emergencyFund')) {
      db.prepare(`ALTER TABLE assets ADD COLUMN emergencyFund REAL NOT NULL DEFAULT 0`).run();
    }
  }
  
  // Create fund_accounts table
  const fundAccountsTableExists = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='fund_accounts'
  `).get();
  
  if (!fundAccountsTableExists) {
    db.prepare(`
      CREATE TABLE fund_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        amount REAL NOT NULL DEFAULT 0,
        description TEXT,
        color TEXT DEFAULT '#3B82F6',
        icon TEXT DEFAULT 'FaChartLine',
        isActive BOOLEAN NOT NULL DEFAULT 1,
        isInvesting BOOLEAN NOT NULL DEFAULT 0,
        sortOrder INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  } else {
    // Check if the isInvesting column exists, add it if not
    const columns = db.prepare(`PRAGMA table_info(fund_accounts)`).all() as ColumnInfo[];
    const columnNames = columns.map(col => col.name);
    
    if (!columnNames.includes('isInvesting')) {
      // Add the isInvesting column
      db.prepare(`
        ALTER TABLE fund_accounts
        ADD COLUMN isInvesting BOOLEAN NOT NULL DEFAULT 0
      `).run();
    }
  }
  
  const recurringTransactionsTableExists = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='recurring_transactions'
  `).get();
  
  if (!recurringTransactionsTableExists) {
    // Create recurring transactions table
    db.prepare(`
      CREATE TABLE recurring_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        dueDate INTEGER NOT NULL, /* Day of month (1-31) */
        isEssential INTEGER NOT NULL DEFAULT 0, /* Boolean 0 or 1 */
        categoryId INTEGER,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (categoryId) REFERENCES recurring_categories(id) ON DELETE CASCADE
      )
    `).run();
  }

  const paySettingsTableExists = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='pay_settings'
  `).get();
  
  if (!paySettingsTableExists) {
    // Create pay settings table
    db.prepare(`
      CREATE TABLE pay_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lastPayDate TEXT NOT NULL,
        frequency TEXT NOT NULL, /* 'weekly' or 'biweekly' */
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  }
  
  const completedTransactionsTableExists = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='completed_transactions'
  `).get();
  
  if (!completedTransactionsTableExists) {
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
  }

  // Check if pending transaction overrides table exists
  const pendingTransactionOverridesTableExists = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='pending_transaction_overrides'
  `).get();
  
  if (!pendingTransactionOverridesTableExists) {
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
  }

  // Check if budget categories table exists
  const budgetCategoriesTableExists = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='budget_categories'
  `).get();
  
  if (!budgetCategoriesTableExists) {
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
  }

  // Check if recurring transaction categories table exists
  const recurringCategoriesTableExists = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='recurring_categories'
  `).get();
  
  if (!recurringCategoriesTableExists) {
    // Create recurring transaction categories table
    db.prepare(`
      CREATE TABLE recurring_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#3B82F6', /* Default blue color */
        isActive INTEGER NOT NULL DEFAULT 1, /* Boolean 0 or 1 */
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  }

  // Check if transactions table exists
  const transactionsTableExists = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'
  `).get();
  
  if (!transactionsTableExists) {
    // Create transactions table
    db.prepare(`
      CREATE TABLE transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL, /* YYYY-MM-DD format */
        categoryId INTEGER,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        cashBack REAL,
        cashbackPosted INTEGER DEFAULT 0,
        notes TEXT,
        pending INTEGER,
        pendingTipAmount REAL DEFAULT 0,
        sortOrder INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (categoryId) REFERENCES budget_categories(id) ON DELETE SET NULL
      )
    `).run();
  } else {
    // Check if the cashbackPosted column exists, add it if not
    const columns = db.prepare(`PRAGMA table_info(transactions)`).all() as ColumnInfo[];
    const columnNames = columns.map(col => col.name);
    
    if (!columnNames.includes('cashbackPosted')) {
      // Add the cashbackPosted column
      db.prepare(`
        ALTER TABLE transactions
        ADD COLUMN cashbackPosted INTEGER DEFAULT 0
      `).run();
    }
    
    // Check if the pendingTipAmount column exists, add it if not
    if (!columnNames.includes('pendingTipAmount')) {
      // Add the pendingTipAmount column
      db.prepare(`
        ALTER TABLE transactions
        ADD COLUMN pendingTipAmount REAL DEFAULT 0
      `).run();
    }
    
    // Check if the sortOrder column exists, add it if not
    if (!columnNames.includes('sortOrder')) {
      // Add the sortOrder column
      db.prepare(`
        ALTER TABLE transactions
        ADD COLUMN sortOrder INTEGER DEFAULT 0
      `).run();
      
      // Initialize sortOrder for existing transactions based on their ID
      db.prepare(`
        UPDATE transactions 
        SET sortOrder = id 
        WHERE sortOrder = 0
      `).run();
    }
  }

  // Check if investments table exists
  const investmentsTableExists = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='investments'
  `).get();
  
  if (!investmentsTableExists) {
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
  }

  // Check if investment_snapshots table exists
  const investmentSnapshotsTableExists = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='investment_snapshots'
  `).get();
  
  if (!investmentSnapshotsTableExists) {
    // Create investment snapshots table
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
  }

  // Check if income_data table exists
  const incomeDataTableExists = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='income_data'
  `).get();
  
  if (!incomeDataTableExists) {
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
  }

  // Check if savings_plan table exists
  const savingsPlanTableExists = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='savings_plan'
  `).get();
  
  if (!savingsPlanTableExists) {
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
  }

  // Check if credit_cards table exists
  const creditCardsTableExists = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='credit_cards'
  `).get();
  
  if (!creditCardsTableExists) {
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
  }

  // Check if income table exists
  const incomeTableExists = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='income'
  `).get();
  
  if (!incomeTableExists) {
    // Create income table
    db.prepare(`
      CREATE TABLE income (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        is_recurring INTEGER NOT NULL DEFAULT 0,
        frequency TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  }

  // Check if investments table has the symbol column
  const investmentsColumns = db.prepare(`PRAGMA table_info(investments)`).all() as ColumnInfo[];
  const columnNames = investmentsColumns.map(col => col.name);
  
  if (!columnNames.includes('symbol')) {
    // Recreate investments table with the symbol column
    try {
      // Extract existing data
      const existingInvestments = db.prepare(`SELECT * FROM investments`).all();
      
      // Drop the table
      db.prepare('DROP TABLE investments').run();
      
      // Create new table with correct schema
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
      
      // Reinsert data if possible
      if (existingInvestments && existingInvestments.length > 0) {
        const insertStmt = db.prepare(`
          INSERT INTO investments (id, name, shares, avgPrice, currentPrice, lastUpdated, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const inv of existingInvestments) {
          insertStmt.run(
            (inv as any).id,
            (inv as any).name,
            (inv as any).shares,
            (inv as any).avgPrice,
            (inv as any).currentPrice,
            (inv as any).lastUpdated,
            (inv as any).createdAt
          );
        }
      }
    } catch (error) {
      console.error('Error recreating investments table:', error);
    }
  }
}

// Close the database connection when the process exits
process.on('exit', () => {
  if (db) {
    db.close();
  }
});

// Define interfaces for assets
export interface AssetRecord {
  id?: number;
  date: string;
  cash: number;
  stocks: number;
  interest: number;
  checking: number;
  retirement401k: number;
  houseFund: number;
  vacationFund: number;
  emergencyFund: number;
  totalAssets: number;
  createdAt?: string;
}

// Assets queries - Updated with new field names
export function saveAssets(assets: {
  cash: number;
  stocks: number;
  interest: number;
  checking: number;
  retirement401k: number;
  houseFund: number;
  vacationFund: number;
  emergencyFund: number;
}) {
  const db = getDb();
  const totalAssets = Object.values({
    cash: assets.cash,
    stocks: assets.stocks,
    interest: assets.interest,
    checking: assets.checking,
    retirement401k: assets.retirement401k,
    houseFund: assets.houseFund,
    vacationFund: assets.vacationFund,
    emergencyFund: assets.emergencyFund
  }).reduce((sum, value) => sum + value, 0);
  
  const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Remove old fields for backward compatibility
  const stmt = db.prepare(`
    INSERT INTO assets (
      date, 
      cash, 
      stocks, 
      interest,
      checking, 
      retirement401k, 
      houseFund, 
      vacationFund, 
      emergencyFund,
      totalAssets
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    currentDate,
    assets.cash,
    assets.stocks,
    assets.interest,
    assets.checking,
    assets.retirement401k,
    assets.houseFund,
    assets.vacationFund,
    assets.emergencyFund,
    totalAssets
  );
  
  return result.lastInsertRowid;
}

export function getLatestAssets(): AssetRecord | undefined {
  const db = getDb();
  const assets = db.prepare(`
    SELECT * FROM assets ORDER BY id DESC LIMIT 1
  `).get() as AssetRecord | undefined;
  
  // No need to check for old field values since this is a fresh deployment
  
  return assets;
}

// Fund Accounts Interface and Functions
export interface FundAccount {
  id?: number;
  name: string;
  amount: number;
  description?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
  isInvesting?: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Fund Accounts CRUD operations
export function getAllFundAccounts(): FundAccount[] {
  const db = getDb();
  const fundAccounts = db.prepare(`
    SELECT * FROM fund_accounts 
    WHERE isActive = 1 
    ORDER BY sortOrder ASC, name ASC
  `).all() as FundAccount[];
  
  return fundAccounts;
}

export function createFundAccount(fundAccount: Omit<FundAccount, 'id' | 'createdAt' | 'updatedAt'>): number {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO fund_accounts (
      name, amount, description, color, icon, isActive, isInvesting, sortOrder
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    fundAccount.name,
    fundAccount.amount || 0,
    fundAccount.description || '',
    fundAccount.color || '#3B82F6',
    fundAccount.icon || 'FaPiggyBank',
    fundAccount.isActive !== false ? 1 : 0,
    fundAccount.isInvesting === true ? 1 : 0,
    fundAccount.sortOrder || 0
  );
  
  return result.lastInsertRowid as number;
}

export function updateFundAccount(id: number, fundAccount: Partial<FundAccount>): boolean {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE fund_accounts 
    SET name = COALESCE(?, name),
        amount = COALESCE(?, amount),
        description = COALESCE(?, description),
        color = COALESCE(?, color),
        icon = COALESCE(?, icon),
        isActive = COALESCE(?, isActive),
        isInvesting = COALESCE(?, isInvesting),
        sortOrder = COALESCE(?, sortOrder),
        updatedAt = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  
  const result = stmt.run(
    fundAccount.name || null,
    fundAccount.amount !== undefined ? fundAccount.amount : null,
    fundAccount.description !== undefined ? fundAccount.description : null,
    fundAccount.color || null,
    fundAccount.icon || null,
    fundAccount.isActive !== undefined ? (fundAccount.isActive ? 1 : 0) : null,
    fundAccount.isInvesting !== undefined ? (fundAccount.isInvesting ? 1 : 0) : null,
    fundAccount.sortOrder !== undefined ? fundAccount.sortOrder : null,
    id
  );
  
  return result.changes > 0;
}

export function deleteFundAccount(id: number): boolean {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE fund_accounts 
    SET isActive = 0, updatedAt = CURRENT_TIMESTAMP 
    WHERE id = ?
  `);
  
  const result = stmt.run(id);
  return result.changes > 0;
}

export function getTotalFundAccountsAmount(): number {
  const db = getDb();
  const result = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total 
    FROM fund_accounts 
    WHERE isActive = 1
  `).get() as { total: number };
  
  return result.total;
}

export function getTotalInvestingFundAccountsAmount(): number {
  const db = getDb();
  const result = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total 
    FROM fund_accounts 
    WHERE isActive = 1 AND isInvesting = 1
  `).get() as { total: number };
  
  return result.total;
}

// Recurring Transactions queries
export interface RecurringTransaction {
  id?: number;
  name: string;
  amount: number;
  dueDate: number;
  isEssential: boolean;
  categoryId?: number | null;
  createdAt?: string;
  category?: RecurringCategory; // Optional joined category data
}

export function saveRecurringTransaction(transaction: RecurringTransaction) {
  const db = getDb();
  
  // Validate the categoryId to ensure it exists
  const categoryIdToUse = validateRecurringCategoryId(transaction.categoryId || null);
  
  const stmt = db.prepare(`
    INSERT INTO recurring_transactions (
      name,
      amount,
      dueDate,
      isEssential,
      categoryId
    ) VALUES (?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    transaction.name,
    transaction.amount,
    transaction.dueDate,
    transaction.isEssential ? 1 : 0,
    categoryIdToUse
  );
  
  return result.lastInsertRowid;
}

export function validateRecurringCategoryId(categoryId: number | null): number | null {
  if (categoryId === null) {
    return null;
  }
  
  try {
    const db = getDb();
    
    // Check if the category exists
    const category = db.prepare(`
      SELECT id FROM recurring_categories WHERE id = ?
    `).get(categoryId);
    
    if (!category) {
      console.warn(`Category ID ${categoryId} does not exist, resetting to null`);
      return null;
    }
    
    return categoryId;
  } catch (error) {
    console.error('Error validating category ID:', error);
    return null; // Default to null on any error
  }
}

export function updateRecurringTransaction(transaction: RecurringTransaction) {
  const db = getDb();
  
  // Validate the categoryId to ensure it exists
  const categoryIdToUse = validateRecurringCategoryId(transaction.categoryId || null);
  
  const stmt = db.prepare(`
    UPDATE recurring_transactions
    SET name = ?, amount = ?, dueDate = ?, isEssential = ?, categoryId = ?
    WHERE id = ?
  `);
  
  const result = stmt.run(
    transaction.name,
    transaction.amount,
    transaction.dueDate,
    transaction.isEssential ? 1 : 0,
    categoryIdToUse,
    transaction.id
  );
  
  return result.changes;
}

export function deleteRecurringTransaction(id: number) {
  const db = getDb();
  
  const stmt = db.prepare(`
    DELETE FROM recurring_transactions WHERE id = ?
  `);
  
  const result = stmt.run(id);
  
  return result.changes;
}

export function getAllRecurringTransactions() {
  const db = getDb();
  
  const transactions = db.prepare(`
    SELECT t.*, c.name as categoryName, c.color as categoryColor 
    FROM recurring_transactions t
    LEFT JOIN recurring_categories c ON t.categoryId = c.id
    ORDER BY t.dueDate ASC
  `).all();
  
  // Convert isEssential from 0/1 to boolean and format category data
  return transactions.map((transaction: any) => {
    const result: RecurringTransaction = {
      ...transaction,
      isEssential: !!transaction.isEssential
    };
    
    // Add category object if available
    if (transaction.categoryName) {
      result.category = {
        id: transaction.categoryId,
        name: transaction.categoryName,
        color: transaction.categoryColor,
        isActive: true
      } as RecurringCategory;
    }
    
    return result;
  });
}

// Pay Settings queries
export interface PaySettings {
  id?: number;
  lastPayDate: string;
  frequency: 'weekly' | 'biweekly';
  createdAt?: string;
}

export function savePaySettings(settings: PaySettings) {
  const db = getDb();
  
  // Delete any existing settings first (we only want one record)
  db.prepare(`DELETE FROM pay_settings`).run();
  
  const stmt = db.prepare(`
    INSERT INTO pay_settings (
      lastPayDate,
      frequency
    ) VALUES (?, ?)
  `);
  
  const result = stmt.run(
    settings.lastPayDate,
    settings.frequency
  );
  
  return result.lastInsertRowid;
}

export function getPaySettings(): PaySettings | null {
  const db = getDb();
  
  const result = db.prepare(`
    SELECT * FROM pay_settings ORDER BY id DESC LIMIT 1
  `).get() as PaySettings | undefined;
  
  return result || null;
}

// Interface for completed transactions
export interface CompletedTransaction {
  id?: number;
  recurringTransactionId: number;
  completedDate: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  createdAt?: string;
}

// Save a completed transaction
export function saveCompletedTransaction(transaction: CompletedTransaction) {
  const db = getDb();
  
  const stmt = db.prepare(`
    INSERT INTO completed_transactions (
      recurringTransactionId,
      completedDate,
      payPeriodStart,
      payPeriodEnd
    ) VALUES (?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    transaction.recurringTransactionId,
    transaction.completedDate,
    transaction.payPeriodStart,
    transaction.payPeriodEnd
  );
  
  return result.lastInsertRowid;
}

// Get completed transactions for a specific pay period
export function getCompletedTransactionsForPayPeriod(payPeriodStart: string, payPeriodEnd: string) {
  const db = getDb();
  
  return db.prepare(`
    SELECT * FROM completed_transactions 
    WHERE payPeriodStart = ? AND payPeriodEnd = ?
  `).all(payPeriodStart, payPeriodEnd);
}

// Check if a transaction is completed for a specific pay period
export function isTransactionCompletedForPayPeriod(
  recurringTransactionId: number, 
  payPeriodStart: string,
  payPeriodEnd: string
) {
  const db = getDb();
  
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM completed_transactions 
    WHERE recurringTransactionId = ? AND payPeriodStart = ? AND payPeriodEnd = ?
  `).get(recurringTransactionId, payPeriodStart, payPeriodEnd) as { count: number };
  
  return result.count > 0;
}

// Delete a completed transaction
export function deleteCompletedTransaction(id: number) {
  const db = getDb();
  
  const stmt = db.prepare(`
    DELETE FROM completed_transactions WHERE id = ?
  `);
  
  const result = stmt.run(id);
  
  return result.changes;
}

// Updated function to get pending transactions with completion status
export function getPendingTransactions() {
  const db = getDb();
  const paySettings = getPaySettings();
  
  // Get current date at the start of the day in local timezone
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  
  if (!paySettings) {
    return [];
  }
  
  // Get all recurring transactions
  const recurringTransactions = getAllRecurringTransactions();
  
  // Start with the last pay date from settings, normalized to start of day
  const lastPayDateStr = paySettings.lastPayDate;
  // Use the Date constructor with year, month, day to avoid timezone issues
  const [year, month, day] = lastPayDateStr.split('-').map(num => parseInt(num, 10));
  const lastPayDate = new Date(year, month - 1, day); // month is 0-indexed in JS Date
  lastPayDate.setHours(0, 0, 0, 0);
  
  // Calculate the next pay date based on frequency (weekly or biweekly)
  let nextPayDate = new Date(lastPayDate);
  if (paySettings.frequency === 'weekly') {
    nextPayDate.setDate(lastPayDate.getDate() + 7);
  } else { // biweekly
    nextPayDate.setDate(lastPayDate.getDate() + 14);
  }
  
  // If next pay date is already in the past, keep adding pay periods until it's in the future
  while (nextPayDate <= currentDate) {
    if (paySettings.frequency === 'weekly') {
      nextPayDate.setDate(nextPayDate.getDate() + 7);
    } else { // biweekly
      nextPayDate.setDate(nextPayDate.getDate() + 14);
    }
  }
  
  // Set the current pay period to be from last pay date to next pay date
  // This is the key change - we always use the exact dates from settings
  let currentPeriodStart = new Date(lastPayDate);
  let currentPeriodEnd = new Date(nextPayDate);
  
  // Helper function to format dates consistently in YYYY-MM-DD format (timezone neutral)
  const formatDateToYYYYMMDD = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  
  const payPeriodStart = formatDateToYYYYMMDD(currentPeriodStart);
  const payPeriodEnd = formatDateToYYYYMMDD(currentPeriodEnd);
  
  // Get the current month details for calculating due dates
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  // Next month calculation
  const nextMonth = (currentMonth + 1) % 12;
  const nextMonthYear = nextMonth === 0 ? currentYear + 1 : currentYear;
  
  // Get all pending transaction overrides for this pay period
  const overrides = db.prepare(`
    SELECT * FROM pending_transaction_overrides
    WHERE payPeriodStart = ? AND payPeriodEnd = ?
  `).all(payPeriodStart, payPeriodEnd);
  
  // Create a map of transaction ID to override amount for quick lookup
  const overrideMap = new Map();
  overrides.forEach((override: any) => {
    overrideMap.set(override.recurringTransactionId, override.amount);
  });
  
  // Filter transactions that fall within the current pay period
  const pendingTransactions = recurringTransactions.filter(transaction => {
    // Calculate due dates for the current month
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const adjustedDueDate = Math.min(transaction.dueDate, daysInCurrentMonth);
    const currentMonthDueDate = new Date(currentYear, currentMonth, adjustedDueDate);
    currentMonthDueDate.setHours(0, 0, 0, 0);
    
    // Calculate due dates for the next month (for transactions that might cross month boundaries)
    const daysInNextMonth = new Date(nextMonthYear, nextMonth + 1, 0).getDate();
    const nextMonthAdjustedDueDate = Math.min(transaction.dueDate, daysInNextMonth);
    const nextMonthDueDate = new Date(nextMonthYear, nextMonth, nextMonthAdjustedDueDate);
    nextMonthDueDate.setHours(0, 0, 0, 0);
    
    // Choose the relevant due date for comparison
    // If current month due date falls within the pay period, use it
    if (currentMonthDueDate >= currentPeriodStart && currentMonthDueDate <= currentPeriodEnd) {
      return true;
    }
    // If next month due date falls within the pay period, use it
    else if (nextMonthDueDate >= currentPeriodStart && nextMonthDueDate <= currentPeriodEnd) {
      return true;
    }
    // Not in the current pay period
    return false;
  });
  
  // Check completed status for each transaction
  return pendingTransactions.map(transaction => {
    // Determine which month's due date to use
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const adjustedDueDate = Math.min(transaction.dueDate, daysInCurrentMonth);
    const currentMonthDueDate = new Date(currentYear, currentMonth, adjustedDueDate);
    currentMonthDueDate.setHours(0, 0, 0, 0);
    
    const daysInNextMonth = new Date(nextMonthYear, nextMonth + 1, 0).getDate();
    const nextMonthAdjustedDueDate = Math.min(transaction.dueDate, daysInNextMonth);
    const nextMonthDueDate = new Date(nextMonthYear, nextMonth, nextMonthAdjustedDueDate);
    nextMonthDueDate.setHours(0, 0, 0, 0);
    
    // Choose the due date that falls within the pay period
    let dueDate;
    if (currentMonthDueDate >= currentPeriodStart && currentMonthDueDate <= currentPeriodEnd) {
      dueDate = currentMonthDueDate;
    } else {
      dueDate = nextMonthDueDate;
    }
    
    // Calculate days until due
    const daysUntilDue = Math.max(0, Math.ceil((dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    // Check if the transaction is completed for this pay period
    const isCompleted = isTransactionCompletedForPayPeriod(
      transaction.id as number,
      payPeriodStart,
      payPeriodEnd
    );
    
    // Check for custom amount override for this transaction
    const amount = overrideMap.has(transaction.id as number) 
      ? overrideMap.get(transaction.id as number) 
      : transaction.amount;
    
    return {
      ...transaction,
      amount: amount, // Use override amount if available
      formattedDate: formatDateToYYYYMMDD(dueDate),
      daysUntilDue: daysUntilDue,
      payPeriodStart: payPeriodStart,
      payPeriodEnd: payPeriodEnd,
      isCompleted: isCompleted
    };
  }).sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

// Budget Categories

export interface BudgetCategory {
  id?: number;
  name: string;
  allocatedAmount: number;
  color: string;
  isActive?: boolean;
  createdAt?: string;
}

export function getAllBudgetCategories() {
  const db = getDb();
  
  const categories = db.prepare(`
    SELECT * FROM budget_categories ORDER BY name ASC
  `).all();
  
  return categories.map((category: any) => ({
    ...category,
    isActive: !!category.isActive
  }));
}

export function getActiveBudgetCategories() {
  const db = getDb();
  
  const categories = db.prepare(`
    SELECT * FROM budget_categories WHERE isActive = 1 ORDER BY name ASC
  `).all();
  
  return categories.map((category: any) => ({
    ...category,
    isActive: true
  }));
}

export function getBudgetCategoryById(id: number) {
  const db = getDb();
  
  const category = db.prepare(`
    SELECT * FROM budget_categories WHERE id = ?
  `).get(id);
  
  if (category) {
    return {
      ...category as Record<string, any>,
      isActive: !!(category as Record<string, any>).isActive
    };
  }
  
  return null;
}

export function createBudgetCategory(category: BudgetCategory) {
  const db = getDb();
  
  const stmt = db.prepare(`
    INSERT INTO budget_categories (
      name,
      allocatedAmount,
      color,
      isActive
    ) VALUES (?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    category.name,
    category.allocatedAmount,
    category.color,
    category.isActive ? 1 : 0
  );
  
  return result.lastInsertRowid;
}

export function updateBudgetCategory(category: BudgetCategory) {
  if (!category.id) {
    throw new Error('Category ID is required for update');
  }
  
  const db = getDb();
  
  const stmt = db.prepare(`
    UPDATE budget_categories
    SET name = ?, allocatedAmount = ?, color = ?, isActive = ?
    WHERE id = ?
  `);
  
  const result = stmt.run(
    category.name,
    category.allocatedAmount,
    category.color,
    category.isActive ? 1 : 0,
    category.id
  );
  
  return result.changes;
}

export function deleteBudgetCategory(id: number) {
  const db = getDb();
  
  const stmt = db.prepare(`
    DELETE FROM budget_categories WHERE id = ?
  `);
  
  const result = stmt.run(id);
  
  return result.changes;
}

export function getTotalBudgetAllocated() {
  const db = getDb();
  
  const result = db.prepare(`
    SELECT SUM(allocatedAmount) as total FROM budget_categories WHERE isActive = 1
  `).get() as { total: number } | { total: null };
  
  return result.total || 0;
}

// Transactions

export interface Transaction {
  id?: number;
  date: string;
  categoryId: number | null;
  name: string;
  amount: number;
  cashBack?: number;
  cashbackPosted?: boolean;
  notes?: string;
  pending?: boolean;
  pendingTipAmount?: number;
  sortOrder?: number;
  createdAt?: string;
  category?: BudgetCategory; // Optional joined category data
}

export function getAllTransactions() {
  const db = getDb();
  
  const transactions = db.prepare(`
    SELECT t.*, 
           c.id as cat_id, c.name as cat_name, c.color as cat_color 
    FROM transactions t
    LEFT JOIN budget_categories c ON t.categoryId = c.id
    ORDER BY t.date DESC, t.sortOrder ASC, t.createdAt DESC
  `).all();
  
  return transactions.map((row: any) => {
    const transaction: Transaction = {
      id: row.id,
      date: row.date,
      categoryId: row.categoryId,
      name: row.name,
      amount: row.amount,
      cashBack: row.cashBack || 0,
      cashbackPosted: row.cashbackPosted === 1,
      notes: row.notes,
      pending: row.pending === 1,
      pendingTipAmount: row.pendingTipAmount || 0,
      createdAt: row.createdAt
    };
    
    // Add joined category data if available
    if (row.cat_id) {
      transaction.category = {
        id: row.cat_id,
        name: row.cat_name,
        color: row.cat_color,
        allocatedAmount: 0, // We don't need this value for display
        isActive: true
      };
    }
    
    return transaction;
  });
}

export function getTransactionById(id: number) {
  const db = getDb();
  
  const transaction = db.prepare(`
    SELECT t.*, 
           c.id as cat_id, c.name as cat_name, c.color as cat_color 
    FROM transactions t
    LEFT JOIN budget_categories c ON t.categoryId = c.id
    WHERE t.id = ?
  `).get(id) as Record<string, any> | undefined;
  
  if (!transaction) return null;
  
  const result: Transaction = {
    id: transaction.id,
    date: transaction.date,
    categoryId: transaction.categoryId,
    name: transaction.name,
    amount: transaction.amount,
    cashBack: transaction.cashBack || 0,
    cashbackPosted: transaction.cashbackPosted === 1,
    notes: transaction.notes,
    pending: transaction.pending === 1,
    pendingTipAmount: transaction.pendingTipAmount || 0,
    createdAt: transaction.createdAt
  };
  
  // Add joined category data if available
  if (transaction.cat_id) {
    result.category = {
      id: transaction.cat_id,
      name: transaction.cat_name,
      color: transaction.cat_color,
      allocatedAmount: 0, // We don't need this value for display
      isActive: true
    };
  }
  
  return result;
}

export function createTransaction(transaction: Transaction) {
  const db = getDb();
  
  // Get the next sortOrder value
  const maxSortOrder = db.prepare(`SELECT MAX(sortOrder) as maxSort FROM transactions`).get() as { maxSort: number };
  const nextSortOrder = (maxSortOrder.maxSort || 0) + 1;
  
  const stmt = db.prepare(`
    INSERT INTO transactions (
      date,
      categoryId,
      name,
      amount,
      cashBack,
      cashbackPosted,
      notes,
      pending,
      pendingTipAmount,
      sortOrder
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    transaction.date,
    transaction.categoryId,
    transaction.name,
    transaction.amount,
    transaction.cashBack || 0,
    transaction.cashbackPosted ? 1 : 0,
    transaction.notes || null,
    transaction.pending ? 1 : 0,
    transaction.pendingTipAmount || 0,
    transaction.sortOrder || nextSortOrder
  );
  
  return result.lastInsertRowid;
}

export function updateTransaction(transaction: Transaction) {
  if (!transaction.id) {
    throw new Error('Transaction ID is required for update');
  }
  
  const db = getDb();
  
  const stmt = db.prepare(`
    UPDATE transactions
    SET date = ?, categoryId = ?, name = ?, amount = ?, cashBack = ?, cashbackPosted = ?, notes = ?, pending = ?, pendingTipAmount = ?, sortOrder = ?
    WHERE id = ?
  `);
  
  const result = stmt.run(
    transaction.date,
    transaction.categoryId,
    transaction.name,
    transaction.amount,
    transaction.cashBack || 0,
    transaction.cashbackPosted ? 1 : 0,
    transaction.notes || null,
    transaction.pending ? 1 : 0,
    transaction.pendingTipAmount || 0,
    transaction.sortOrder || 0,
    transaction.id
  );
  
  return result.changes;
}

export function deleteTransaction(id: number) {
  const db = getDb();
  
  const stmt = db.prepare(`
    DELETE FROM transactions WHERE id = ?
  `);
  
  const result = stmt.run(id);
  
  return result.changes;
}

export function reorderTransactions(transactionIds: number[]) {
  const db = getDb();
  
  const stmt = db.prepare(`
    UPDATE transactions
    SET sortOrder = ?
    WHERE id = ?
  `);
  
  // Update sort order for each transaction
  for (let i = 0; i < transactionIds.length; i++) {
    stmt.run(i + 1, transactionIds[i]);
  }
  
  return transactionIds.length;
}

export function getTransactionsByDateRange(startDate: string, endDate: string) {
  const db = getDb();
  
  const transactions = db.prepare(`
    SELECT t.*, 
           c.id as cat_id, c.name as cat_name, c.color as cat_color 
    FROM transactions t
    LEFT JOIN budget_categories c ON t.categoryId = c.id
    WHERE t.date >= ? AND t.date <= ?
    ORDER BY t.date DESC, t.createdAt DESC
  `).all(startDate, endDate);
  
  return transactions.map((row: any) => {
    const transaction: Transaction = {
      id: row.id,
      date: row.date,
      categoryId: row.categoryId,
      name: row.name,
      amount: row.amount,
      cashBack: row.cashBack || 0,
      cashbackPosted: row.cashbackPosted === 1,
      notes: row.notes,
      pending: row.pending === 1,
      pendingTipAmount: row.pendingTipAmount || 0,
      createdAt: row.createdAt
    };
    
    // Add joined category data if available
    if (row.cat_id) {
      transaction.category = {
        id: row.cat_id,
        name: row.cat_name,
        color: row.cat_color,
        allocatedAmount: 0,
        isActive: true
      };
    }
    
    return transaction;
  });
}

export function getTransactionsByCategoryId(categoryId: number) {
  const db = getDb();
  
  const transactions = db.prepare(`
    SELECT * FROM transactions 
    WHERE categoryId = ?
    ORDER BY date DESC, createdAt DESC
  `).all(categoryId);
  
  return transactions;
}

export function getTransactionsByCategoryIdAndDateRange(categoryId: number, startDate: string, endDate: string) {
  const db = getDb();
  
  const transactions = db.prepare(`
    SELECT * FROM transactions 
    WHERE categoryId = ? AND date >= ? AND date <= ?
    ORDER BY date DESC, createdAt DESC
  `).all(categoryId, startDate, endDate);
  
  return transactions;
}

export function getCategorySpending(startDate: string, endDate: string) {
  const db = getDb();
  
  // First check if the cashBack column exists in the transactions table
  const columns = db.prepare(`PRAGMA table_info(transactions)`).all() as ColumnInfo[];
  const columnNames = columns.map(col => col.name);
  const hasCashBackColumn = columnNames.includes('cashBack');
  
  // Modify the query based on whether cashBack column exists
  let query = `
    SELECT 
      c.id, 
      c.name, 
      c.allocatedAmount,
      c.color,
      SUM(t.amount) as spent
  `;
  
  // Only include cashBack in the query if the column exists
  if (hasCashBackColumn) {
    query += `, SUM(IFNULL(t.cashBack, 0)) as cashBack`;
  } else {
    query += `, 0 as cashBack`;
  }
  
  query += `
    FROM budget_categories c
    LEFT JOIN transactions t ON c.id = t.categoryId AND t.date >= ? AND t.date <= ?
    WHERE c.isActive = 1
    GROUP BY c.id
    ORDER BY c.name
  `;
  
  const spending = db.prepare(query).all(startDate, endDate);
  
  return spending.map((row: any) => ({
    id: row.id,
    name: row.name,
    allocatedAmount: row.allocatedAmount,
    color: row.color,
    spent: (row.spent || 0) - (row.cashBack || 0),
    cashBack: row.cashBack || 0,
    rawSpent: row.spent || 0
  }));
}

// Update only a pending transaction amount for current period without affecting the base recurring transaction
export function updatePendingTransactionAmount(transactionId: number, amount: number, payPeriodStart: string, payPeriodEnd: string) {
  const db = getDb();
  
  // First, check if there's already a custom amount record for this transaction in this pay period
  const existingRecord = db.prepare(`
    SELECT * FROM pending_transaction_overrides
    WHERE recurringTransactionId = ? AND payPeriodStart = ? AND payPeriodEnd = ?
  `).get(transactionId, payPeriodStart, payPeriodEnd);
  
  if (existingRecord) {
    // Update existing record
    const stmt = db.prepare(`
      UPDATE pending_transaction_overrides
      SET amount = ?
      WHERE recurringTransactionId = ? AND payPeriodStart = ? AND payPeriodEnd = ?
    `);
    
    const result = stmt.run(
      amount,
      transactionId,
      payPeriodStart,
      payPeriodEnd
    );
    
    return result.changes;
  } else {
    // Create new record
    const stmt = db.prepare(`
      INSERT INTO pending_transaction_overrides (
        recurringTransactionId,
        amount,
        payPeriodStart,
        payPeriodEnd
      ) VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      transactionId,
      amount,
      payPeriodStart,
      payPeriodEnd
    );
    
    return result.lastInsertRowid;
  }
}

// Investments

export interface Investment {
  id?: number;
  symbol: string;
  name: string;
  shares: number;
  avgPrice: number;
  currentPrice?: number;
  lastUpdated?: string;
  createdAt?: string;
  prevDayPrice?: number; // Add field for previous day price
}

// Check if investments table exists and has the correct schema
function ensureInvestmentsTable() {
  const db = getDb();
  
  // Check if investments table exists
  const investmentsTableExists = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='investments'
  `).get();
  
  if (!investmentsTableExists) {
    // Create investments table with proper schema
    db.prepare(`
      CREATE TABLE investments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        name TEXT NOT NULL,
        shares REAL NOT NULL,
        avgPrice REAL NOT NULL,
        currentPrice REAL DEFAULT 0,
        prevDayPrice REAL DEFAULT 0,
        lastUpdated TEXT DEFAULT CURRENT_TIMESTAMP,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    return true;
  } else {
    // Check the columns in the investments table
    const columns = db.prepare(`PRAGMA table_info(investments)`).all() as ColumnInfo[];
    const columnNames = columns.map(col => col.name);
    
    // If we're missing the symbol column, we need to recreate the table
    if (!columnNames.includes('symbol')) {
      // First, back up the old data if any
      try {
        // Create a backup table
        db.prepare(`DROP TABLE IF EXISTS investments_backup`).run();
        db.prepare(`CREATE TABLE investments_backup AS SELECT * FROM investments`).run();
        
        // Drop the original table
        db.prepare(`DROP TABLE investments`).run();
        
        // Recreate the table with proper schema
        db.prepare(`
          CREATE TABLE investments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            name TEXT NOT NULL,
            shares REAL NOT NULL,
            avgPrice REAL NOT NULL,
            currentPrice REAL DEFAULT 0,
            prevDayPrice REAL DEFAULT 0,
            lastUpdated TEXT DEFAULT CURRENT_TIMESTAMP,
            createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `).run();
        
        return true;
      } catch (error) {
        console.error('Error recreating investments table:', error);
        // If anything fails, just create the table as new
        db.prepare(`DROP TABLE IF EXISTS investments`).run();
        db.prepare(`
          CREATE TABLE investments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            name TEXT NOT NULL,
            shares REAL NOT NULL,
            avgPrice REAL NOT NULL,
            currentPrice REAL DEFAULT 0,
            prevDayPrice REAL DEFAULT 0,
            lastUpdated TEXT DEFAULT CURRENT_TIMESTAMP,
            createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `).run();
        return true;
      }
    }
    
    // Add prevDayPrice column if it doesn't exist
    if (!columnNames.includes('prevDayPrice')) {
      db.prepare(`ALTER TABLE investments ADD COLUMN prevDayPrice REAL DEFAULT 0`).run();
    }
    
    return false;
  }
}

export function getAllInvestments() {
  try {
    const db = getDb();
    
    // Ensure the investments table exists with the correct schema
    ensureInvestmentsTable();
    
    const investments = db.prepare(`
      SELECT * FROM investments ORDER BY symbol ASC
    `).all() as Investment[];
    
    return investments;
  } catch (error) {
    console.error('Error getting investments:', error);
    return [];
  }
}

export function getInvestmentById(id: number) {
  try {
    const db = getDb();
    
    // Ensure the investments table exists with the correct schema
    ensureInvestmentsTable();
    
    return db.prepare(`
      SELECT * FROM investments WHERE id = ?
    `).get(id) as Investment | undefined;
  } catch (error) {
    console.error('Error getting investment by ID:', error);
    return undefined;
  }
}

export function createInvestment(investment: Investment) {
  try {
    const db = getDb();
    
    // Ensure the investments table exists with the correct schema
    ensureInvestmentsTable();
    
    const result = db.prepare(`
      INSERT INTO investments (symbol, name, shares, avgPrice, currentPrice)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      investment.symbol.toUpperCase(),
      investment.name,
      investment.shares,
      investment.avgPrice,
      investment.currentPrice || 0
    );
    
    return result.lastInsertRowid as number;
  } catch (error) {
    console.error('Error creating investment:', error);
    throw error;
  }
}

export function updateInvestment(investment: Investment) {
  try {
    const db = getDb();
    
    // Ensure the investments table exists with the correct schema
    ensureInvestmentsTable();
    
    const result = db.prepare(`
      UPDATE investments
      SET symbol = ?, name = ?, shares = ?, avgPrice = ?, currentPrice = ?, lastUpdated = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      investment.symbol.toUpperCase(),
      investment.name,
      investment.shares,
      investment.avgPrice,
      investment.currentPrice || 0,
      investment.id
    );
    
    return result.changes;
  } catch (error) {
    console.error('Error updating investment:', error);
    throw error;
  }
}

export function updateInvestmentPrice(id: number, currentPrice: number) {
  try {
    const db = getDb();
    
    // Ensure the investments table exists with the correct schema
    ensureInvestmentsTable();
    
    const result = db.prepare(`
      UPDATE investments
      SET currentPrice = ?, lastUpdated = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(currentPrice, id);
    
    return result.changes;
  } catch (error) {
    console.error('Error updating investment price:', error);
    throw error;
  }
}

export function deleteInvestment(id: number) {
  try {
    const db = getDb();
    
    // Ensure the investments table exists with the correct schema
    ensureInvestmentsTable();
    
    const result = db.prepare(`
      DELETE FROM investments WHERE id = ?
    `).run(id);
    
    return result.changes;
  } catch (error) {
    console.error('Error deleting investment:', error);
    throw error;
  }
}

export function saveDailyInvestmentSnapshot() {
  try {
    const db = getDb();
    const investments = getAllInvestments();
    
    // For each investment, store current price as previous day price
    for (const investment of investments) {
      if (!investment.id || !investment.currentPrice) continue;
      
      db.prepare(`
        UPDATE investments
        SET prevDayPrice = ?
        WHERE id = ?
      `).run(investment.currentPrice, investment.id);
    }
    
    return investments.length;
  } catch (error) {
    console.error('Error saving daily investment snapshot:', error);
    return 0;
  }
}

export function calculateDayChanges() {
  try {
    const db = getDb();
    
    // Ensure the investments table exists with the correct schema
    ensureInvestmentsTable();
    
    // Get all investments
    const investments = getAllInvestments();
    
    // Calculate total portfolio value and day change
    let totalValue = 0;
    let totalDayChange = 0;
    let totalDayChangePercent = 0;
    let totalCost = 0;
    
    for (const investment of investments) {
      const { id, shares, currentPrice, prevDayPrice, avgPrice } = investment;
      
      // Calculate investment value and cost
      const investmentValue = shares * (currentPrice || 0);
      const investmentCost = shares * avgPrice;
      totalValue += investmentValue;
      totalCost += investmentCost;
      
      // If we have both current and previous day prices, calculate day change
      if (currentPrice !== undefined && prevDayPrice !== undefined && prevDayPrice > 0) {
        const dayChange = (currentPrice - prevDayPrice) * shares;
        totalDayChange += dayChange;
        
        // Calculate weighted day change percentage for this investment
        const dayChangePercent = (currentPrice - prevDayPrice) / prevDayPrice * 100;
        const weightedPercent = investmentValue / totalValue * dayChangePercent;
        totalDayChangePercent += weightedPercent;
      }
    }
    
    return {
      totalValue,
      totalCost,
      totalGainLoss: totalValue - totalCost,
      totalGainLossPercent: totalCost > 0 ? (totalValue - totalCost) / totalCost * 100 : 0,
      dayChange: totalDayChange,
      dayChangePercent: totalDayChangePercent,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error calculating day changes:', error);
    return {
      totalValue: 0,
      totalCost: 0,
      totalGainLoss: 0,
      totalGainLossPercent: 0,
      dayChange: 0,
      dayChangePercent: 0,
      lastUpdated: new Date().toISOString()
    };
  }
}

// Income interface and functions
export interface IncomeData {
  id?: number;
  payAmount: number;
  payFrequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
  workHoursPerWeek: number;
  workDaysPerWeek: number;
  bonusPercentage: number;
  createdAt?: string;
}

export function getIncomeData(): IncomeData | null {
  const db = getDb();
  const income = db.prepare(`
    SELECT * FROM income_data ORDER BY id DESC LIMIT 1
  `).get() as IncomeData | undefined;
  
  return income || null;
}

export function saveIncomeData(data: IncomeData): number {
  const db = getDb();
  
  // First check if there's existing data
  const existingIncome = getIncomeData();
  
  if (existingIncome && existingIncome.id) {
    // Update existing record
    db.prepare(`
      UPDATE income_data SET
        payAmount = ?,
        payFrequency = ?,
        workHoursPerWeek = ?,
        workDaysPerWeek = ?,
        bonusPercentage = ?
      WHERE id = ?
    `).run(
      data.payAmount,
      data.payFrequency,
      data.workHoursPerWeek,
      data.workDaysPerWeek,
      data.bonusPercentage,
      existingIncome.id
    );
    
    return existingIncome.id;
  } else {
    // Insert new record
    const result = db.prepare(`
      INSERT INTO income_data (
        payAmount, 
        payFrequency, 
        workHoursPerWeek, 
        workDaysPerWeek, 
        bonusPercentage
      ) VALUES (?, ?, ?, ?, ?)
    `).run(
      data.payAmount,
      data.payFrequency,
      data.workHoursPerWeek,
      data.workDaysPerWeek,
      data.bonusPercentage
    );
    
    return result.lastInsertRowid as number;
  }
}

// Savings Plan interface and functions
export interface SavingsPlanData {
  id?: number;
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  yearlyContribution: number;
  yearlyBonus: number;
  annualReturn: number;
  createdAt?: string;
}

export function getSavingsPlanData(): SavingsPlanData | null {
  const db = getDb();
  const savingsPlan = db.prepare(`
    SELECT * FROM savings_plan ORDER BY id DESC LIMIT 1
  `).get() as SavingsPlanData | undefined;
  
  return savingsPlan || null;
}

export function saveSavingsPlanData(data: SavingsPlanData): number {
  const db = getDb();
  
  // First check if there's existing data
  const existingSavingsPlan = getSavingsPlanData();
  
  if (existingSavingsPlan && existingSavingsPlan.id) {
    // Update existing record
    db.prepare(`
      UPDATE savings_plan SET
        currentAge = ?,
        retirementAge = ?,
        currentSavings = ?,
        yearlyContribution = ?,
        yearlyBonus = ?,
        annualReturn = ?
      WHERE id = ?
    `).run(
      data.currentAge,
      data.retirementAge,
      data.currentSavings,
      data.yearlyContribution,
      data.yearlyBonus,
      data.annualReturn,
      existingSavingsPlan.id
    );
    
    return existingSavingsPlan.id;
  } else {
    // Insert new record
    const result = db.prepare(`
      INSERT INTO savings_plan (
        currentAge,
        retirementAge,
        currentSavings,
        yearlyContribution,
        yearlyBonus,
        annualReturn
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      data.currentAge,
      data.retirementAge,
      data.currentSavings,
      data.yearlyContribution,
      data.yearlyBonus,
      data.annualReturn
    );
    
    return result.lastInsertRowid as number;
  }
}

// Credit Card interface and functions
export interface CreditCard {
  id?: number;
  name: string;
  balance: number;
  limit: number;
  color: string;
  createdAt?: string;
}

export function getAllCreditCards(): CreditCard[] {
  const db = getDb();
  return db.prepare('SELECT * FROM credit_cards ORDER BY name').all() as CreditCard[];
}

export function getCreditCardById(id: number): CreditCard | null {
  const db = getDb();
  return db.prepare('SELECT * FROM credit_cards WHERE id = ?').get(id) as CreditCard | null;
}

export function createCreditCard(card: CreditCard): number {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO credit_cards (name, balance, "limit", color)
    VALUES (?, ?, ?, ?)
  `).run(card.name, card.balance, card.limit, card.color);
  
  return result.lastInsertRowid as number;
}

export function updateCreditCard(card: CreditCard): boolean {
  if (!card.id) return false;
  
  const db = getDb();
  const result = db.prepare(`
    UPDATE credit_cards SET
      name = ?,
      balance = ?,
      "limit" = ?,
      color = ?
    WHERE id = ?
  `).run(card.name, card.balance, card.limit, card.color, card.id);
  
  return result.changes > 0;
}

export function deleteCreditCard(id: number): boolean {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM credit_cards WHERE id = ?').run(id);
    return result.changes > 0;
  } catch (error) {
    console.error('Error deleting credit card:', error);
    return false;
  }
}

// Income entries interface and functions
export interface IncomeEntry {
  id?: number;
  source: string;
  amount: number;
  date: string;
  is_recurring: boolean;
  frequency?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export function getAllIncomeEntries(): IncomeEntry[] {
  const db = getDb();
  try {
    return db.prepare('SELECT * FROM income ORDER BY date DESC').all() as IncomeEntry[];
  } catch (error) {
    console.error('Error getting income entries:', error);
    return [];
  }
}

export function getIncomeEntriesByDateRange(startDate: string, endDate: string): IncomeEntry[] {
  const db = getDb();
  try {
    return db.prepare(`
      SELECT * FROM income 
      WHERE date >= ? AND date <= ?
      ORDER BY date DESC
    `).all(startDate, endDate) as IncomeEntry[];
  } catch (error) {
    console.error('Error getting income entries by date range:', error);
    return [];
  }
}

export function createIncomeEntry(entry: IncomeEntry): number {
  const db = getDb();
  try {
    const result = db.prepare(`
      INSERT INTO income (
        source, amount, date, is_recurring, frequency, notes
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      entry.source,
      entry.amount,
      entry.date,
      entry.is_recurring ? 1 : 0,
      entry.frequency || '',
      entry.notes || ''
    );
    
    return result.lastInsertRowid as number;
  } catch (error) {
    console.error('Error creating income entry:', error);
    return -1;
  }
}

export function updateIncomeEntry(entry: IncomeEntry): boolean {
  if (!entry.id) return false;
  
  const db = getDb();
  try {
    const result = db.prepare(`
      UPDATE income SET
        source = ?,
        amount = ?,
        date = ?,
        is_recurring = ?,
        frequency = ?,
        notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      entry.source,
      entry.amount,
      entry.date,
      entry.is_recurring ? 1 : 0,
      entry.frequency || '',
      entry.notes || '',
      entry.id
    );
    
    return result.changes > 0;
  } catch (error) {
    console.error('Error updating income entry:', error);
    return false;
  }
}

export function deleteIncomeEntry(id: number): boolean {
  const db = getDb();
  try {
    const result = db.prepare('DELETE FROM income WHERE id = ?').run(id);
    return result.changes > 0;
  } catch (error) {
    console.error('Error deleting income entry:', error);
    return false;
  }
}

// Calculate total income for a date range
export function getTotalIncomeForDateRange(startDate: string, endDate: string): number {
  const db = getDb();
  try {
    const result = db.prepare(`
      SELECT SUM(amount) as total 
      FROM income 
      WHERE date >= ? AND date <= ?
    `).get(startDate, endDate) as { total: number } | undefined;
    
    return result?.total || 0;
  } catch (error) {
    console.error('Error calculating total income for date range:', error);
    return 0;
  }
}

// Recurring Transaction Categories
export interface RecurringCategory {
  id?: number;
  name: string;
  color: string;
  isActive: boolean;
  createdAt?: string;
}

export function getAllRecurringCategories() {
  const db = getDb();
  
  const categories = db.prepare(`
    SELECT * FROM recurring_categories ORDER BY name ASC
  `).all();
  
  // Convert isActive from 0/1 to boolean
  return categories.map((category: any) => ({
    ...category,
    isActive: !!category.isActive
  }));
}

export function getRecurringCategoryById(id: number) {
  const db = getDb();
  
  const category = db.prepare(`
    SELECT * FROM recurring_categories WHERE id = ?
  `).get(id);
  
  if (!category) return null;
  
  // Use type assertion and ensure isActive is boolean
  const result = category as any;
  return {
    ...result,
    isActive: !!result.isActive
  } as RecurringCategory;
}

export function saveRecurringCategory(category: RecurringCategory) {
  const db = getDb();
  
  const stmt = db.prepare(`
    INSERT INTO recurring_categories (
      name,
      color,
      isActive
    ) VALUES (?, ?, ?)
  `);
  
  const result = stmt.run(
    category.name,
    category.color,
    category.isActive ? 1 : 0
  );
  
  return result.lastInsertRowid;
}

export function updateRecurringCategory(category: RecurringCategory) {
  const db = getDb();
  
  const stmt = db.prepare(`
    UPDATE recurring_categories
    SET name = ?, color = ?, isActive = ?
    WHERE id = ?
  `);
  
  const result = stmt.run(
    category.name,
    category.color,
    category.isActive ? 1 : 0,
    category.id
  );
  
  return result.changes;
}

export function deleteRecurringCategory(id: number) {
  const db = getDb();
  
  // First, set categoryId to null for any recurring transactions using this category
  db.prepare(`
    UPDATE recurring_transactions
    SET categoryId = NULL
    WHERE categoryId = ?
  `).run(id);
  
  // Then delete the category
  const stmt = db.prepare(`
    DELETE FROM recurring_categories WHERE id = ?
  `);
  
  const result = stmt.run(id);
  
  return result.changes;
}