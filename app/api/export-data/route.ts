import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

// Get the database connection
function getDB() {
  const dbPath = path.resolve('./data/finance.db');
  return new Database(dbPath);
}

// Helper to check if a table exists
function tableExists(db: Database.Database, tableName: string): boolean {
  try {
    const result = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name = ?"
    ).get(tableName);
    return !!result;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

export async function GET(_request: NextRequest) {
  try {
    const db = getDB();
    
    // Prepare the data object to be exported
    const exportData: Record<string, unknown> = {};
    
    try {
      // ===== DASHBOARD DATA =====
      
      // Get user settings (Dashboard)
      if (tableExists(db, 'user_settings')) {
        try {
          const userSettings = db.prepare(`
            SELECT * FROM user_settings LIMIT 1
          `).get();
          
          if (userSettings) {
            exportData.userSettings = userSettings;
          }
        } catch (error) {
          console.error('Error exporting user_settings:', error);
        }
      }
      
      // ===== PAY SCHEDULE =====
      
      // Get pay settings
      if (tableExists(db, 'pay_settings')) {
        try {
          const paySettings = db.prepare(`
            SELECT * FROM pay_settings LIMIT 1
          `).get();
          
          if (paySettings) {
            exportData.paySettings = paySettings;
          }
        } catch (error) {
          console.error('Error exporting pay_settings:', error);
        }
      }
      
      // ===== BUDGET =====
      
      // Get budget categories
      if (tableExists(db, 'budget_categories')) {
        try {
          const budgetCategories = db.prepare(`
            SELECT * FROM budget_categories ORDER BY id
          `).all();
          
          if (budgetCategories && budgetCategories.length > 0) {
            exportData.budgetCategories = budgetCategories;
          }
        } catch (error) {
          console.error('Error exporting budget_categories:', error);
        }
      }
      
      // ===== INVESTMENTS =====
      
      // Get investments
      if (tableExists(db, 'investments')) {
        try {
          const investments = db.prepare(`
            SELECT * FROM investments ORDER BY id
          `).all();
          
          if (investments && investments.length > 0) {
            exportData.investments = investments;
          }
        } catch (error) {
          console.error('Error exporting investments:', error);
        }
      }
      
      // Get investment snapshots if they exist
      if (tableExists(db, 'investment_snapshots')) {
        try {
          const investmentSnapshots = db.prepare(`
            SELECT * FROM investment_snapshots ORDER BY date DESC
          `).all();
          
          if (investmentSnapshots && investmentSnapshots.length > 0) {
            exportData.investmentSnapshots = investmentSnapshots;
          }
        } catch (error) {
          console.error('Error exporting investment_snapshots:', error);
        }
      }
      
      // ===== CREDIT CARDS =====
      
      // Get credit cards
      if (tableExists(db, 'credit_cards')) {
        try {
          const creditCards = db.prepare(`
            SELECT * FROM credit_cards ORDER BY id
          `).all();
          
          if (creditCards && creditCards.length > 0) {
            exportData.creditCards = creditCards;
          }
        } catch (error) {
          console.error('Error exporting credit_cards:', error);
        }
      }
      
      // ===== RECURRING TRANSACTIONS =====
      
      // Get recurring transactions
      if (tableExists(db, 'recurring_transactions')) {
        try {
          const recurringTransactions = db.prepare(`
            SELECT * FROM recurring_transactions ORDER BY id
          `).all();
          
          if (recurringTransactions && recurringTransactions.length > 0) {
            exportData.recurringTransactions = recurringTransactions;
          }
        } catch (error) {
          console.error('Error exporting recurring_transactions:', error);
        }
      }
      
      // ===== PENDING TRANSACTIONS =====
      
      // Get pending transactions
      if (tableExists(db, 'pending_transactions')) {
        try {
          const pendingTransactions = db.prepare(`
            SELECT * FROM pending_transactions ORDER BY id
          `).all();
          
          if (pendingTransactions && pendingTransactions.length > 0) {
            exportData.pendingTransactions = pendingTransactions;
          }
        } catch (error) {
          console.error('Error exporting pending_transactions:', error);
        }
      }
      
      // Get completed transactions
      if (tableExists(db, 'completed_transactions')) {
        try {
          const completedTransactions = db.prepare(`
            SELECT * FROM completed_transactions ORDER BY id
          `).all();
          
          if (completedTransactions && completedTransactions.length > 0) {
            exportData.completedTransactions = completedTransactions;
          }
        } catch (error) {
          console.error('Error exporting completed_transactions:', error);
        }
      }
      
      // Get pending transaction overrides
      if (tableExists(db, 'pending_transaction_overrides')) {
        try {
          const pendingTransactionOverrides = db.prepare(`
            SELECT * FROM pending_transaction_overrides ORDER BY id
          `).all();
          
          if (pendingTransactionOverrides && pendingTransactionOverrides.length > 0) {
            exportData.pendingTransactionOverrides = pendingTransactionOverrides;
          }
        } catch (error) {
          console.error('Error exporting pending_transaction_overrides:', error);
        }
      }
      
      // ===== ASSETS =====
      
      // Get assets
      if (tableExists(db, 'assets')) {
        try {
          const assets = db.prepare(`
            SELECT * FROM assets ORDER BY id
          `).all();
          
          if (assets && assets.length > 0) {
            exportData.assets = assets;
          }
        } catch (error) {
          console.error('Error exporting assets:', error);
        }
      }
      
      // ===== SAVINGS PLAN =====
      
      // Try savings_plan first (singular, which exists in your DB)
      if (tableExists(db, 'savings_plan')) {
        try {
          const savingsPlans = db.prepare(`
            SELECT * FROM savings_plan ORDER BY id
          `).all();
          
          if (savingsPlans && savingsPlans.length > 0) {
            exportData.savingsPlans = savingsPlans;
          }
        } catch (error) {
          console.error('Error exporting savings_plan:', error);
        }
      } else if (tableExists(db, 'savings_plans')) {
        // Try savings_plans (plural) as fallback
        try {
          const savingsPlans = db.prepare(`
            SELECT * FROM savings_plans ORDER BY id
          `).all();
          
          if (savingsPlans && savingsPlans.length > 0) {
            exportData.savingsPlans = savingsPlans;
          }
        } catch (error) {
          console.error('Error exporting savings_plans:', error);
        }
      }
      
      // ===== INCOME =====
      
      // Get income
      if (tableExists(db, 'income')) {
        try {
          const income = db.prepare(`
            SELECT * FROM income ORDER BY id
          `).all();
          
          if (income && income.length > 0) {
            exportData.income = income;
          }
        } catch (error) {
          console.error('Error exporting income:', error);
        }
      }
      
      // Get income data
      if (tableExists(db, 'income_data')) {
        try {
          const incomeData = db.prepare(`
            SELECT * FROM income_data ORDER BY id
          `).all();
          
          if (incomeData && incomeData.length > 0) {
            exportData.incomeData = incomeData;
          }
        } catch (error) {
          console.error('Error exporting income_data:', error);
        }
      }
      
      // ===== TRANSACTIONS =====
      
      // Get transactions
      if (tableExists(db, 'transactions')) {
        try {
          const transactions = db.prepare(`
            SELECT * FROM transactions ORDER BY date DESC
          `).all();
          
          if (transactions && transactions.length > 0) {
            exportData.transactions = transactions;
          }
        } catch (error) {
          console.error('Error exporting transactions:', error);
        }
      }
      
      // Get categories (if separate from budget categories)
      if (tableExists(db, 'categories')) {
        try {
          const categories = db.prepare(`
            SELECT * FROM categories ORDER BY id
          `).all();
          
          if (categories && categories.length > 0) {
            exportData.categories = categories;
          }
        } catch (error) {
          console.error('Error exporting categories:', error);
        }
      }
      
      // Add metadata
      exportData.metadata = {
        exported_at: new Date().toISOString(),
        version: '1.0',
        sections: [
          'Dashboard',
          'Assets',
          'Investments',
          'Income',
          'Pay Schedule',
          'Budget',
          'Savings Plan',
          'Credit Cards',
          'Transactions',
          'Pending Transactions', 
          'Recurring Transactions'
        ]
      };
      
      return NextResponse.json(exportData, { status: 200 });
    } finally {
      // Close the database connection
      db.close();
    }
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
} 