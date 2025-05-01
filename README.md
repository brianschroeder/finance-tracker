# Finance Tracker

A comprehensive personal finance tracking application built with Next.js, TypeScript, and SQLite.

## Features

- **Financial Dashboard**: View all your financial data in one place
- **Asset Tracking**: Track cash, stocks, retirement accounts, and more
- **Budget Management**: Create and manage budget categories
- **Transaction Recording**: Log and categorize your spending
- **Credit Card Management**: Monitor credit card balances and utilization
- **Savings Goals**: Set up and track funds for specific goals
- **Pay Period Planning**: Track expenses based on your pay schedule
- **Investment Monitoring**: Monitor investment performance
- **Data Import/Export**: Backup and restore your financial data
- **Stock Price API**: Track investment portfolio with real-time stock prices

## Technology Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite with better-sqlite3
- **Charts**: Chart.js with React-Chartjs-2
- **Date Handling**: date-fns
- **APIs**: Yahoo Finance for stock data

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- NPM or Yarn

### Installation

1. Clone the repository
   ```
   git clone https://github.com/brianschroeder/finance-tracker.git
   cd finance-tracker
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Copy the environment file and adjust as needed
   ```
   cp .env.example .env.local
   ```

4. Initialize the database (clean setup)
   ```
   npm run initialize
   ```
   This script will:
   - Check if a database already exists
   - Allow you to reset it if one exists
   - Create a new database with all required tables
   - Configure initial settings

5. Start the development server
   ```
   npm run dev
   ```

6. Open [http://localhost:3500](http://localhost:3500) in your browser and follow the onboarding process

### Onboarding Process

When you first start the application, you'll be guided through an onboarding process to set up:

1. **Pay Schedule**: Configure when you get paid and how frequently
2. **Income Details**: Add information about your income and work schedule
3. **Assets**: Add details about your savings, checking, and investments
4. **Budget Categories**: Create categories for tracking your spending

The application will create a personalized financial dashboard based on your actual data.

### Docker Setup (Alternative)

If you prefer using Docker:

1. Clone the repository
   ```
   git clone https://github.com/brianschroeder/finance-tracker.git
   cd finance-tracker
   ```

2. Start the application with Docker Compose
   ```
   docker-compose up -d
   ```

3. Open [http://localhost:3500](http://localhost:3500) in your browser

## Deployment

The application can be deployed in several ways:

### Self-Hosting

1. Build the application
   ```
   npm run build
   ```

2. Start the production server
   ```
   npm start
   ```

3. Or use a process manager like PM2
   ```
   npm install -g pm2
   pm2 start npm --name "finance-tracker" -- start
   ```

### Docker in Production

For production Docker deployments, ensure you mount a volume for the data directory to persist the database:

```
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Using the Application

After completing the onboarding process, you'll be presented with a dashboard that displays your financial information based on the data you've provided.

Key areas of the application:

- **Dashboard**: Overview of your financial situation
- **Assets**: Update your account balances
- **Budget**: Manage your spending categories
- **Transactions**: Record your spending
- **Credit Cards**: Track your credit card usage
- **Savings Plan**: Plan for retirement and other savings goals

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

## Data Management

### Backing Up Your Data

You can export your financial data to a JSON file by clicking the "Export Data" button in the Settings page under the "Data Management" tab. This file can be imported back into the application if needed.

### Importing Data

To import previously exported data, go to the Settings page, select the "Data Management" tab, and click the "Import Data" button to select your JSON file.

### Resetting Your Database

If you need to start over with a clean database:

```
npm run initialize
```

Follow the prompts to reset your database.

## Stock Price API

This application uses the [yahoo-finance2](https://github.com/gadicc/node-yahoo-finance2) library to fetch real-time stock prices. This unofficial API for Yahoo Finance provides:

- Real-time stock quotes
- Historical data
- Stock search
- No API key required

The implementation is located in:
- `lib/yahoo-finance.ts` - Yahoo Finance API implementation
- `app/api/stock-price/route.ts` - API endpoint for stock price data
- `lib/stock-api.ts` - Client-side utility functions

## For Developers

### Environment Variables

Copy the `.env.example` file to `.env.local` to set up environment variables:

```
cp .env.example .env.local
```

### Development Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm start` - Start the production server
- `npm run lint` - Lint the codebase
- `npm run initialize` - Initialize or reset the database
- `npm run setup-db` - Create database tables without the interactive prompt

### Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## Troubleshooting

If you encounter any issues during setup:

1. Check that the data directory exists in the project root
2. Ensure you have proper permissions to create and write to files
3. If the database gets corrupted, delete the `data/finance.db` file and run `npm run initialize` again

For more detailed setup instructions, see [SETUP.md](SETUP.md).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Icons from Heroicons and React-Icons
- UI design inspiration from various finance apps
