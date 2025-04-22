# Project Structure

This document provides an overview of the Finance Tracker application structure, explaining key directories and files to help new contributors understand the codebase.

## Root Directories

- `/app` - Next.js App Router files (pages, layouts, route handlers)
- `/components` - Reusable React components
- `/lib` - Utility functions, database access, API clients
- `/public` - Static assets (images, fonts, etc.)
- `/data` - Database files and exported data
- `/scripts` - Utility scripts for database setup, migrations, etc.

## App Router Structure

The `/app` directory follows the Next.js App Router convention:

- `/app/page.tsx` - Homepage (dashboard)
- `/app/layout.tsx` - Root layout (applied to all routes)
- `/app/(routes)/` - Contains all application routes
- `/app/api/` - API route handlers

## Key Components

- `/components/ui/` - Basic UI components (buttons, inputs, etc.)
- `/components/dashboard/` - Dashboard-specific components
- `/components/transactions/` - Transaction-related components
- `/components/budget/` - Budget-related components
- `/components/investments/` - Investment-related components

## Database and Data Access

- `/lib/db.ts` - Database connection and utility functions
- `/lib/accounts.ts` - Functions for accessing account data
- `/lib/transactions.ts` - Functions for accessing transaction data
- `/lib/budget.ts` - Functions for accessing budget data
- `/lib/stocks.ts` - Functions for accessing stock data

## API Integration

- `/lib/yahoo-finance.ts` - Yahoo Finance API integration
- `/app/api/stock-price/route.ts` - API endpoint for stock prices

## Scripts

- `/scripts/setup.js` - Sets up the database with initial schema and sample data
- `/scripts/check-db.js` - Verifies database structure and integrity

## Configuration

- `/.env.local` - Environment variables (not in version control)
- `/.env.example` - Example environment variables for reference
- `/next.config.ts` - Next.js configuration
- `/tailwind.config.js` - Tailwind CSS configuration

## Development Tools

- `/.github/` - GitHub-specific files (PR templates, issue templates, workflows)
- `/tsconfig.json` - TypeScript configuration

## GitHub Repository

This project is set up for GitHub deployment with:

- GitHub Actions CI workflow for automated testing and building
- Issue templates for bug reports and feature requests
- Contribution guidelines
- Security policy
- MIT License

The repository is configured to not include sensitive information (.env files) and to properly handle database files to prevent accidental commits of data. 