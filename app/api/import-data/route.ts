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

// Helper to get column names for a table
function getTableColumns(db: Database.Database, tableName: string): string[] {
  try {
    const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
    return tableInfo.map((column: any) => column.name);
  } catch (error) {
    console.error(`Error getting columns for table ${tableName}:`, error);
    return [];
  }
}

// Helper to filter and map data to match available columns
function prepareDataForTable(data: any, columns: string[]): any {
  const filteredData: any = {};
  
  // Only include properties that exist as columns in the table
  for (const column of columns) {
    if (data[column] !== undefined) {
      filteredData[column] = data[column];
    }
  }
  
  // Ensure required fields for common tables
  if (columns.includes('source') && filteredData['source'] === undefined) {
    filteredData['source'] = 'Unknown Source';
  }
  
  if (columns.includes('name') && filteredData['name'] === undefined) {
    filteredData['name'] = 'Unnamed';
  }
  
  if (columns.includes('amount') && filteredData['amount'] === undefined) {
    filteredData['amount'] = 0;
  }
  
  if (columns.includes('date') && filteredData['date'] === undefined) {
    filteredData['date'] = new Date().toISOString().split('T')[0];
  }
  
  return filteredData;
}

export async function POST(request: NextRequest) {
  try {
    const db = getDB();
    
    // Get data from request
    const data = await request.json();

    // Start a transaction
    db.prepare('BEGIN TRANSACTION').run();
    
    try {
      // Get list of actual tables in the database
      interface TableRow {
        name: string;
      }
      const existingTables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      ).all().map(row => (row as TableRow).name);
      
      console.log('Existing tables:', existingTables);
      
      // Clear existing data from all tables that exist
      // List tables in the correct order to avoid foreign key constraints
      const tablesToClearIfExist = [
        'investments',
        'budget_categories',
        'credit_cards',
        'transactions',
        'expenses',
        'income',
        'assets',
        'savings_plans',
        'pay_settings',
        'recurring_transactions',
        'pending_transactions',
        'completed_transactions',
        'user_settings',
        'savings_plan'
      ];
      
      for (const table of tablesToClearIfExist) {
        try {
          if (existingTables.includes(table)) {
            console.log(`Clearing table: ${table}`);
            db.prepare(`DELETE FROM ${table}`).run();
          } else {
            console.log(`Skipping non-existent table: ${table}`);
          }
        } catch (error) {
          console.error(`Error clearing table ${table}:`, error);
          // Continue with other tables
        }
      }
      
      // Import data for each table
      // Pay settings
      if (data.paySettings && tableExists(db, 'pay_settings')) {
        try {
          // Get the actual columns in the pay_settings table
          const columns = getTableColumns(db, 'pay_settings');
          console.log(`Found columns for pay_settings:`, columns);
          
          if (columns.length > 0) {
            // Prepare data based on available columns
            const paySettingsData = prepareDataForTable(data.paySettings, columns);
            
            // Generate dynamic SQL based on available columns
            const columnNames = Object.keys(paySettingsData).join(', ');
            const placeholders = Object.keys(paySettingsData).map(() => '?').join(', ');
            
            const insertPaySettings = db.prepare(`
              INSERT INTO pay_settings (${columnNames})
              VALUES (${placeholders})
            `);
            
            // Execute with the values in the same order as columns
            insertPaySettings.run(...Object.values(paySettingsData));
            console.log('Imported pay settings');
          } else {
            console.log('No columns found for pay_settings table');
          }
        } catch (error) {
          console.error('Error importing pay settings:', error);
        }
      }
      
      // Budget categories
      if (data.budgetCategories && Array.isArray(data.budgetCategories) && tableExists(db, 'budget_categories')) {
        try {
          // Get the actual columns in the budget_categories table
          const columns = getTableColumns(db, 'budget_categories');
          console.log(`Found columns for budget_categories:`, columns);
          
          if (columns.length > 0) {
            let importedCount = 0;
            
            // Process each category
            for (const category of data.budgetCategories) {
              // Prepare data based on available columns
              const categoryData = prepareDataForTable(category, columns);
              
              // Only proceed if we have data to insert
              if (Object.keys(categoryData).length > 0) {
                // Generate dynamic SQL based on available columns
                const columnNames = Object.keys(categoryData).join(', ');
                const placeholders = Object.keys(categoryData).map(() => '?').join(', ');
                
                const insertCategory = db.prepare(`
                  INSERT INTO budget_categories (${columnNames})
                  VALUES (${placeholders})
                `);
                
                // Execute with the values in the same order as columns
                insertCategory.run(...Object.values(categoryData));
                importedCount++;
              }
            }
            
            console.log(`Imported ${importedCount} budget categories`);
          } else {
            console.log('No columns found for budget_categories table');
          }
        } catch (error) {
          console.error('Error importing budget categories:', error);
        }
      }
      
      // Investments
      if (data.investments && Array.isArray(data.investments) && tableExists(db, 'investments')) {
        try {
          // Get the actual columns in the investments table
          const columns = getTableColumns(db, 'investments');
          console.log(`Found columns for investments:`, columns);
          
          if (columns.length > 0) {
            let importedCount = 0;
            
            // Process each investment
            for (const investment of data.investments) {
              // Prepare data based on available columns
              const investmentData = prepareDataForTable(investment, columns);
              
              // Only proceed if we have data to insert
              if (Object.keys(investmentData).length > 0) {
                // Generate dynamic SQL based on available columns
                const columnNames = Object.keys(investmentData).join(', ');
                const placeholders = Object.keys(investmentData).map(() => '?').join(', ');
                
                const insertInvestment = db.prepare(`
                  INSERT INTO investments (${columnNames})
                  VALUES (${placeholders})
                `);
                
                // Execute with the values in the same order as columns
                insertInvestment.run(...Object.values(investmentData));
                importedCount++;
              }
            }
            
            console.log(`Imported ${importedCount} investments`);
          } else {
            console.log('No columns found for investments table');
          }
        } catch (error) {
          console.error('Error importing investments:', error);
        }
      }
      
      // Credit cards
      if (data.creditCards && Array.isArray(data.creditCards) && tableExists(db, 'credit_cards')) {
        try {
          // Get the actual columns in the credit_cards table
          const columns = getTableColumns(db, 'credit_cards');
          console.log(`Found columns for credit_cards:`, columns);
          
          if (columns.length > 0) {
            let importedCount = 0;
            
            // Process each credit card
            for (const card of data.creditCards) {
              // Prepare data based on available columns
              const cardData = prepareDataForTable(card, columns);
              
              // Only proceed if we have data to insert
              if (Object.keys(cardData).length > 0) {
                // Generate dynamic SQL based on available columns
                const escapedColumnNames = Object.keys(cardData).map(col => 
                  // Escape reserved SQL keywords
                  col === 'limit' ? `"limit"` : col
                ).join(', ');
                const placeholders = Object.keys(cardData).map(() => '?').join(', ');
                
                const insertCreditCard = db.prepare(`
                  INSERT INTO credit_cards (${escapedColumnNames})
                  VALUES (${placeholders})
                `);
                
                // Execute with the values in the same order as columns
                insertCreditCard.run(...Object.values(cardData));
                importedCount++;
              }
            }
            
            console.log(`Imported ${importedCount} credit cards`);
          } else {
            console.log('No columns found for credit_cards table');
          }
        } catch (error) {
          console.error('Error importing credit cards:', error);
        }
      }
      
      // Expenses
      if (data.expenses && Array.isArray(data.expenses) && tableExists(db, 'expenses')) {
        try {
          // Get the actual columns in the expenses table
          const columns = getTableColumns(db, 'expenses');
          console.log(`Found columns for expenses:`, columns);
          
          if (columns.length > 0) {
            let importedCount = 0;
            
            // Process each expense
            for (const expense of data.expenses) {
              // Prepare data based on available columns
              const expenseData = prepareDataForTable(expense, columns);
              
              // Only proceed if we have data to insert
              if (Object.keys(expenseData).length > 0) {
                // Generate dynamic SQL based on available columns
                const columnNames = Object.keys(expenseData).join(', ');
                const placeholders = Object.keys(expenseData).map(() => '?').join(', ');
                
                const insertExpense = db.prepare(`
                  INSERT INTO expenses (${columnNames})
                  VALUES (${placeholders})
                `);
                
                // Execute with the values in the same order as columns
                insertExpense.run(...Object.values(expenseData));
                importedCount++;
              }
            }
            
            console.log(`Imported ${importedCount} expenses`);
          } else {
            console.log('No columns found for expenses table');
          }
        } catch (error) {
          console.error('Error importing expenses:', error);
        }
      } else if (data.expenses && Array.isArray(data.expenses)) {
        console.log('Skipping expenses import: Table does not exist');
      }
      
      // Assets
      if (data.assets && Array.isArray(data.assets) && tableExists(db, 'assets')) {
        try {
          // Get the actual columns in the assets table
          const columns = getTableColumns(db, 'assets');
          console.log(`Found columns for assets:`, columns);
          
          if (columns.length > 0) {
            let importedCount = 0;
            
            // Process each asset
            for (const asset of data.assets) {
              // Prepare data based on available columns
              const assetData = prepareDataForTable(asset, columns);
              
              // Only proceed if we have data to insert
              if (Object.keys(assetData).length > 0) {
                // Generate dynamic SQL based on available columns
                const columnNames = Object.keys(assetData).join(', ');
                const placeholders = Object.keys(assetData).map(() => '?').join(', ');
                
                const insertAsset = db.prepare(`
                  INSERT INTO assets (${columnNames})
                  VALUES (${placeholders})
                `);
                
                // Execute with the values in the same order as columns
                insertAsset.run(...Object.values(assetData));
                importedCount++;
              }
            }
            
            console.log(`Imported ${importedCount} assets`);
          } else {
            console.log('No columns found for assets table');
          }
        } catch (error) {
          console.error('Error importing assets:', error);
        }
      }
      
      // Savings Plan
      if (data.savingsPlans && Array.isArray(data.savingsPlans) && tableExists(db, 'savings_plan')) {
        try {
          // Get the actual columns in the savings_plan table
          const columns = getTableColumns(db, 'savings_plan');
          console.log(`Found columns for savings_plan:`, columns);
          
          if (columns.length > 0) {
            let importedCount = 0;
            
            // Process each savings plan
            for (const plan of data.savingsPlans) {
              // Map old column names to new ones if needed
              const mappedPlan = {
                ...plan,
                // Ensure column names match the new schema
                target_amount: plan.targetAmount || plan.target_amount,
                current_amount: plan.currentAmount || plan.current_amount,
                target_date: plan.targetDate || plan.target_date,
                created_at: plan.createdAt || plan.created_at,
                updated_at: plan.updatedAt || plan.updated_at
              };

              // Prepare data based on available columns
              const planData = prepareDataForTable(mappedPlan, columns);
              
              // Only proceed if we have data to insert
              if (Object.keys(planData).length > 0) {
                // Generate dynamic SQL based on available columns
                const columnNames = Object.keys(planData).join(', ');
                const placeholders = Object.keys(planData).map(() => '?').join(', ');
                
                const insertSavingsPlan = db.prepare(`
                  INSERT INTO savings_plan (${columnNames})
                  VALUES (${placeholders})
                `);
                
                // Execute with the values in the same order as columns
                insertSavingsPlan.run(...Object.values(planData));
                importedCount++;
              }
            }
            
            console.log(`Imported ${importedCount} savings plans`);
          } else {
            console.log('No columns found for savings_plan table');
          }
        } catch (error) {
          console.error('Error importing savings plans:', error);
        }
      }
      
      // Income
      if (data.income && Array.isArray(data.income) && tableExists(db, 'income')) {
        try {
          // Get the actual columns in the income table
          const columns = getTableColumns(db, 'income');
          console.log(`Found columns for income:`, columns);
          
          if (columns.length > 0) {
            let importedCount = 0;
            
            // Process each income entry
            for (const inc of data.income) {
              // Map old column names to new ones if needed
              const mappedIncome = {
                ...inc,
                // Ensure column names match the new schema
                source: inc.source || inc.name || inc.description || 'Unknown Source',
                amount: inc.amount || 0,
                date: inc.date || inc.income_date || new Date().toISOString().split('T')[0],
                is_recurring: inc.isRecurring || inc.is_recurring || 0,
                frequency: inc.frequency || '',
                notes: inc.notes || '',
                created_at: inc.createdAt || inc.created_at || new Date().toISOString(),
                updated_at: inc.updatedAt || inc.updated_at || new Date().toISOString()
              };

              // Prepare data based on available columns
              const incomeData = prepareDataForTable(mappedIncome, columns);
              
              // Only proceed if we have data to insert
              if (Object.keys(incomeData).length > 0) {
                // Generate dynamic SQL based on available columns
                const columnNames = Object.keys(incomeData).join(', ');
                const placeholders = Object.keys(incomeData).map(() => '?').join(', ');
                
                const insertIncome = db.prepare(`
                  INSERT INTO income (${columnNames})
                  VALUES (${placeholders})
                `);
                
                // Execute with the values in the same order as columns
                insertIncome.run(...Object.values(incomeData));
                importedCount++;
              }
            }
            
            console.log(`Imported ${importedCount} income entries`);
          } else {
            console.log('No columns found for income table');
          }
        } catch (error) {
          console.error('Error importing income:', error);
        }
      }
      
      // Income Data
      if (data.incomeData && Array.isArray(data.incomeData) && tableExists(db, 'income_data')) {
        try {
          // Get the actual columns in the income_data table
          const columns = getTableColumns(db, 'income_data');
          console.log(`Found columns for income_data:`, columns);
          
          if (columns.length > 0) {
            let importedCount = 0;
            
            // Process each income data entry
            for (const income of data.incomeData) {
              // Map old column names to new ones if needed
              const mappedIncomeData = {
                ...income,
                // Ensure column names match the schema
                payAmount: income.payAmount || 0,
                payFrequency: income.payFrequency || 'biweekly',
                workHoursPerWeek: income.workHoursPerWeek || 40,
                workDaysPerWeek: income.workDaysPerWeek || 5,
                bonusPercentage: income.bonusPercentage || 0,
                createdAt: income.createdAt || new Date().toISOString()
              };

              // Prepare data based on available columns
              const preparedData = prepareDataForTable(mappedIncomeData, columns);
              
              // Only proceed if we have data to insert
              if (Object.keys(preparedData).length > 0) {
                try {
                  // Check if record with this ID already exists
                  const existingRecord = db.prepare('SELECT id FROM income_data WHERE id = ?').get(preparedData.id);
                  
                  if (existingRecord) {
                    // If exists, update it instead of inserting
                    const setClause = Object.keys(preparedData)
                      .filter(key => key !== 'id') // Don't update ID
                      .map(key => `${key} = ?`)
                      .join(', ');
                    
                    if (setClause.length > 0) { // Only update if there are fields to update
                      const updateQuery = `UPDATE income_data SET ${setClause} WHERE id = ?`;
                      const updateValues = [
                        ...Object.entries(preparedData)
                          .filter(([key]) => key !== 'id')
                          .map(([, value]) => value),
                        preparedData.id // Add ID for WHERE clause
                      ];
                      
                      db.prepare(updateQuery).run(...updateValues);
                      console.log(`Updated income_data with id ${preparedData.id}`);
                    }
                  } else {
                    // Generate dynamic SQL based on available columns
                    const columnNames = Object.keys(preparedData).join(', ');
                    const placeholders = Object.keys(preparedData).map(() => '?').join(', ');
                    
                    const insertIncomeData = db.prepare(`
                      INSERT INTO income_data (${columnNames})
                      VALUES (${placeholders})
                    `);
                    
                    // Execute with the values in the same order as columns
                    insertIncomeData.run(...Object.values(preparedData));
                  }
                  importedCount++;
                } catch (insertError) {
                  console.error(`Error processing income_data record:`, insertError);
                  // Continue with other records
                }
              }
            }
            
            console.log(`Imported/updated ${importedCount} income_data entries`);
          } else {
            console.log('No columns found for income_data table');
          }
        } catch (error) {
          console.error('Error importing income_data:', error);
        }
      }
      
      // Transactions
      if (data.transactions && Array.isArray(data.transactions) && tableExists(db, 'transactions')) {
        try {
          // Get the actual columns in the transactions table
          const columns = getTableColumns(db, 'transactions');
          console.log(`Found columns for transactions:`, columns);
          
          if (columns.length > 0) {
            let importedCount = 0;
            
            // Process each transaction entry
            for (const transaction of data.transactions) {
              // Prepare data based on available columns
              const transactionData = prepareDataForTable(transaction, columns);
              
              // Only proceed if we have data to insert
              if (Object.keys(transactionData).length > 0) {
                // Generate dynamic SQL based on available columns
                const columnNames = Object.keys(transactionData).join(', ');
                const placeholders = Object.keys(transactionData).map(() => '?').join(', ');
                
                const insertTransaction = db.prepare(`
                  INSERT INTO transactions (${columnNames})
                  VALUES (${placeholders})
                `);
                
                // Execute with the values in the same order as columns
                insertTransaction.run(...Object.values(transactionData));
                importedCount++;
              }
            }
            
            console.log(`Imported ${importedCount} transaction entries`);
          } else {
            console.log('No columns found for transactions table');
          }
        } catch (error) {
          console.error('Error importing transactions:', error);
        }
      }
      
      // Recurring transactions
      if (data.recurringTransactions && Array.isArray(data.recurringTransactions) && tableExists(db, 'recurring_transactions')) {
        try {
          // Get the actual columns in the recurring_transactions table
          const columns = getTableColumns(db, 'recurring_transactions');
          console.log(`Found columns for recurring_transactions:`, columns);
          
          if (columns.length > 0) {
            let importedCount = 0;
            
            // Process each recurring transaction
            for (const transaction of data.recurringTransactions) {
              // Map old column names to new ones if needed
              const mappedTransaction = {
                ...transaction,
                // Ensure column names match the new schema
                name: transaction.name || transaction.description,
                amount: transaction.amount,
                due_date: transaction.dueDate || transaction.due_date,
                is_essential: transaction.isEssential || transaction.is_essential || 0,
                notes: transaction.notes || '',
                created_at: transaction.createdAt || transaction.created_at,
                updated_at: transaction.updatedAt || transaction.updated_at
              };

              // Prepare data based on available columns
              const transactionData = prepareDataForTable(mappedTransaction, columns);
              
              // Only proceed if we have data to insert
              if (Object.keys(transactionData).length > 0) {
                // Generate dynamic SQL based on available columns
                const columnNames = Object.keys(transactionData).join(', ');
                const placeholders = Object.keys(transactionData).map(() => '?').join(', ');
                
                const insertRecurringTransaction = db.prepare(`
                  INSERT INTO recurring_transactions (${columnNames})
                  VALUES (${placeholders})
                `);
                
                // Execute with the values in the same order as columns
                insertRecurringTransaction.run(...Object.values(transactionData));
                importedCount++;
              }
            }
            
            console.log(`Imported ${importedCount} recurring transactions`);
          } else {
            console.log('No columns found for recurring_transactions table');
          }
        } catch (error) {
          console.error('Error importing recurring transactions:', error);
        }
      }
      
      // Pending transactions
      if (data.pendingTransactions && Array.isArray(data.pendingTransactions) && tableExists(db, 'pending_transactions')) {
        try {
          const insertPendingTransaction = db.prepare(`
            INSERT INTO pending_transactions (
              id, name, amount, due_date, is_essential, is_completed, pay_period_start, pay_period_end,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          for (const transaction of data.pendingTransactions) {
            insertPendingTransaction.run(
              transaction.id,
              transaction.name,
              transaction.amount,
              transaction.due_date,
              transaction.is_essential ? 1 : 0,
              transaction.is_completed ? 1 : 0,
              transaction.pay_period_start || null,
              transaction.pay_period_end || null,
              transaction.created_at || new Date().toISOString(),
              transaction.updated_at || new Date().toISOString()
            );
          }
          console.log(`Imported ${data.pendingTransactions.length} pending transactions`);
        } catch (error) {
          console.error('Error importing pending transactions:', error);
        }
      }
      
      // Completed transactions
      if (data.completedTransactions && Array.isArray(data.completedTransactions) && tableExists(db, 'completed_transactions')) {
        try {
          // Get the actual columns in the completed_transactions table
          const columns = getTableColumns(db, 'completed_transactions');
          console.log(`Found columns for completed_transactions:`, columns);
          
          if (columns.length > 0) {
            let importedCount = 0;
            
            // Process each completed transaction
            for (const transaction of data.completedTransactions) {
              // Map old column names to new ones if needed
              const mappedTransaction = {
                ...transaction,
                // Ensure column names match the new schema
                transaction_id: transaction.transactionId || transaction.transaction_id,
                completed_date: transaction.completedDate || transaction.completed_date,
                created_at: transaction.createdAt || transaction.created_at,
                updated_at: transaction.updatedAt || transaction.updated_at
              };

              // Prepare data based on available columns
              const transactionData = prepareDataForTable(mappedTransaction, columns);
              
              // Only proceed if we have data to insert
              if (Object.keys(transactionData).length > 0) {
                // Generate dynamic SQL based on available columns
                const columnNames = Object.keys(transactionData).join(', ');
                const placeholders = Object.keys(transactionData).map(() => '?').join(', ');
                
                const insertCompletedTransaction = db.prepare(`
                  INSERT INTO completed_transactions (${columnNames})
                  VALUES (${placeholders})
                `);
                
                // Execute with the values in the same order as columns
                insertCompletedTransaction.run(...Object.values(transactionData));
                importedCount++;
              }
            }
            
            console.log(`Imported ${importedCount} completed transactions`);
          } else {
            console.log('No columns found for completed_transactions table');
          }
        } catch (error) {
          console.error('Error importing completed transactions:', error);
        }
      }
      
      // Pending transaction overrides
      if (data.pendingTransactionOverrides && Array.isArray(data.pendingTransactionOverrides) && tableExists(db, 'pending_transaction_overrides')) {
        try {
          // Get the actual columns in the pending_transaction_overrides table
          const columns = getTableColumns(db, 'pending_transaction_overrides');
          console.log(`Found columns for pending_transaction_overrides:`, columns);
          
          if (columns.length > 0) {
            let importedCount = 0;
            
            // Process each override
            for (const override of data.pendingTransactionOverrides) {
              // Map old column names to new ones if needed
              const mappedOverride = {
                ...override,
                // Ensure column names match the new schema
                transaction_id: override.transactionId || override.transaction_id,
                override_date: override.overrideDate || override.override_date,
                created_at: override.createdAt || override.created_at,
                updated_at: override.updatedAt || override.updated_at
              };

              // Prepare data based on available columns
              const overrideData = prepareDataForTable(mappedOverride, columns);
              
              // Only proceed if we have data to insert
              if (Object.keys(overrideData).length > 0) {
                // Generate dynamic SQL based on available columns
                const columnNames = Object.keys(overrideData).join(', ');
                const placeholders = Object.keys(overrideData).map(() => '?').join(', ');
                
                const insertOverride = db.prepare(`
                  INSERT INTO pending_transaction_overrides (${columnNames})
                  VALUES (${placeholders})
                `);
                
                // Execute with the values in the same order as columns
                insertOverride.run(...Object.values(overrideData));
                importedCount++;
              }
            }
            
            console.log(`Imported ${importedCount} pending transaction overrides`);
          } else {
            console.log('No columns found for pending_transaction_overrides table');
          }
        } catch (error) {
          console.error('Error importing pending transaction overrides:', error);
        }
      }
      
      // Recurring expenses
      if (data.recurringExpenses && Array.isArray(data.recurringExpenses) && tableExists(db, 'recurring_expenses')) {
        try {
          // Get the actual columns in the recurring_expenses table
          const columns = getTableColumns(db, 'recurring_expenses');
          console.log(`Found columns for recurring_expenses:`, columns);
          
          if (columns.length > 0) {
            let importedCount = 0;
            
            // Process each recurring expense
            for (const expense of data.recurringExpenses) {
              // Prepare data based on available columns
              const expenseData = prepareDataForTable(expense, columns);
              
              // Only proceed if we have data to insert
              if (Object.keys(expenseData).length > 0) {
                // Generate dynamic SQL based on available columns
                const columnNames = Object.keys(expenseData).join(', ');
                const placeholders = Object.keys(expenseData).map(() => '?').join(', ');
                
                const insertExpense = db.prepare(`
                  INSERT INTO recurring_expenses (${columnNames})
                  VALUES (${placeholders})
                `);
                
                // Execute with the values in the same order as columns
                insertExpense.run(...Object.values(expenseData));
                importedCount++;
              }
            }
            
            console.log(`Imported ${importedCount} recurring expenses`);
          } else {
            console.log('No columns found for recurring_expenses table');
          }
        } catch (error) {
          console.error('Error importing recurring expenses:', error);
        }
      }
      
      // Categories
      if (data.categories && Array.isArray(data.categories) && tableExists(db, 'categories')) {
        try {
          // Get the actual columns in the categories table
          const columns = getTableColumns(db, 'categories');
          console.log(`Found columns for categories:`, columns);
          
          if (columns.length > 0) {
            let importedCount = 0;
            
            // Process each category entry
            for (const category of data.categories) {
              // Prepare data based on available columns
              const categoryData = prepareDataForTable(category, columns);
              
              // Only proceed if we have data to insert
              if (Object.keys(categoryData).length > 0) {
                // Generate dynamic SQL based on available columns
                const columnNames = Object.keys(categoryData).join(', ');
                const placeholders = Object.keys(categoryData).map(() => '?').join(', ');
                
                const insertCategory = db.prepare(`
                  INSERT INTO categories (${columnNames})
                  VALUES (${placeholders})
                `);
                
                // Execute with the values in the same order as columns
                insertCategory.run(...Object.values(categoryData));
                importedCount++;
              }
            }
            
            console.log(`Imported ${importedCount} category entries`);
          } else {
            console.log('No columns found for categories table');
          }
        } catch (error) {
          console.error('Error importing categories:', error);
        }
      }
      
      // Accounts
      if (data.accounts && Array.isArray(data.accounts) && tableExists(db, 'accounts')) {
        try {
          // Get the actual columns in the accounts table
          const columns = getTableColumns(db, 'accounts');
          console.log(`Found columns for accounts:`, columns);
          
          if (columns.length > 0) {
            let importedCount = 0;
            
            // Process each account entry
            for (const account of data.accounts) {
              // Prepare data based on available columns
              const accountData = prepareDataForTable(account, columns);
              
              // Only proceed if we have data to insert
              if (Object.keys(accountData).length > 0) {
                // Generate dynamic SQL based on available columns
                const columnNames = Object.keys(accountData).join(', ');
                const placeholders = Object.keys(accountData).map(() => '?').join(', ');
                
                const insertAccount = db.prepare(`
                  INSERT INTO accounts (${columnNames})
                  VALUES (${placeholders})
                `);
                
                // Execute with the values in the same order as columns
                insertAccount.run(...Object.values(accountData));
                importedCount++;
              }
            }
            
            console.log(`Imported ${importedCount} account entries`);
          } else {
            console.log('No columns found for accounts table');
          }
        } catch (error) {
          console.error('Error importing accounts:', error);
        }
      }
      
      // Commit the transaction
      db.prepare('COMMIT').run();
      console.log('Import completed successfully');
      
      return NextResponse.json({ success: true, message: 'Data imported successfully' }, { status: 200 });
    } catch (error) {
      // Rollback the transaction
      db.prepare('ROLLBACK').run();
      throw error;
    } finally {
      // Close the database connection
      if (db) {
        db.close();
      }
    }
  } catch (error) {
    console.error('Error importing data:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to import data', error: String(error) },
      { status: 500 }
    );
  }
}