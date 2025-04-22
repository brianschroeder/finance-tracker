# Data Directory

This directory contains the SQLite database file and any exported data files.

## Contents

- `finance.db` - SQLite database containing all application data
- `*.json` - Exported data files (when using the export feature)

## Notes

- The database file (`finance.db`) is excluded from version control via `.gitignore` to prevent committing personal financial data
- When you run `npm run setup`, a new database with sample data will be created in this directory
- Use the application's export/import features to backup and restore your data

## Database Schema

The database contains the following tables:

- `accounts` - Financial accounts (checking, savings, investments, etc.)
- `transactions` - Financial transactions
- `budget_categories` - Budget categories
- `budget_items` - Monthly budget allocations
- `credit_cards` - Credit card accounts and their details
- `investments` - Investment holdings
- `savings_goals` - Savings goals and progress
- `settings` - Application settings

## Development

For development purposes, you can use a tool like [DB Browser for SQLite](https://sqlitebrowser.org/) to explore and modify the database directly. 