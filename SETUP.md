# Finance Tracker Setup Guide

This guide will walk you through setting up your Finance Tracker application with a clean database.

## Prerequisites

- Node.js (v18 or higher)
- npm (v8 or higher)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/brianschroeder/finance-tracker.git
   cd finance-tracker
   ```

2. Install dependencies:
   ```
   npm install
   ```

## Database Setup

There are two ways to set up the database:

### 1. Automated Setup (Recommended)

Run the initialization script:

```bash
npm run initialize
```

This script will:
- Check if a database already exists
- Ask if you want to reset it if one exists
- Create a new database with all required tables
- Configure initial settings

### 2. Manual Setup

If you prefer to set up the database manually:

1. First, create the database structure:
   ```bash
   npm run setup-db
   ```

2. Start the application:
   ```bash
   npm run dev
   ```

3. Navigate to http://localhost:3000 in your browser and follow the onboarding wizard.

## Onboarding

The onboarding process guides you through setting up:

1. **Pay Schedule**: Configure when you get paid and how frequently
2. **Income Details**: Add information about your income and work schedule
3. **Assets**: Add details about your savings, checking, and investments
4. **Budget Categories**: Create categories for tracking your spending

You can skip any steps during initial setup and complete them later.

## Development

Once everything is set up, you can start the development server:

```bash
npm run dev
```

Then open http://localhost:3000 in your browser.

## Database Structure

The finance tracker uses SQLite with the following tables:

- `assets`: Tracks your financial assets (cash, investments, etc.)
- `recurring_transactions`: Stores monthly bills and subscriptions
- `pay_settings`: Stores information about your pay schedule
- `completed_transactions`: Tracks completed recurring transactions
- `pending_transaction_overrides`: Allows overriding pending transaction amounts
- `budget_categories`: Defines budget categories for expense tracking
- `transactions`: Stores all financial transactions
- `investments`: Tracks investment portfolio
- `investment_snapshots`: Stores historical investment data
- `income_data`: Stores income details
- `savings_plan`: Stores retirement/savings plan information
- `credit_cards`: Tracks credit card information

## Troubleshooting

If you encounter any issues during setup:

1. Check that the data directory exists in the project root
2. Ensure you have proper permissions to create and write to files
3. If the database gets corrupted, delete the `data/finance.db` file and run the setup again

For more help, please open an issue on the GitHub repository. 