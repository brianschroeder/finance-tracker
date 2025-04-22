# Contributing to Finance Tracker

Thank you for your interest in contributing to Finance Tracker! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and considerate of others when contributing to this project.

## How Can I Contribute?

### Reporting Bugs

- Check if the bug has already been reported in the Issues section
- Use the bug report template if available
- Include detailed steps to reproduce the bug
- Include screenshots if applicable
- Specify your operating system, browser, and app version

### Suggesting Features

- Check if the feature has already been suggested in the Issues section
- Use the feature request template if available
- Provide a clear description of the feature
- Explain why this feature would be useful to users

### Pull Requests

1. Fork the repository
2. Create a new branch from `main` for your feature or bugfix
3. Make your changes
4. Run tests if available
5. Submit a pull request to `main`

## Development Setup

1. Clone the repository
   ```
   git clone https://github.com/brianschroeder/finance-tracker.git
   cd finance-tracker
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Start the development server
   ```
   npm run dev
   ```

## Project Structure

```
finance-tracker/
├── app/              # Next.js App Router files
├── components/       # React components
├── lib/              # Utility functions and database access
├── public/           # Static assets
├── scripts/          # Utility scripts for data migration, etc.
├── data/             # Database and JSON files
```

## Coding Standards

- Follow the existing code style
- Use TypeScript for type safety
- Component files should use PascalCase (e.g., `Dashboard.tsx`)
- Utility files should use camelCase (e.g., `database.ts`)
- Write meaningful commit messages

## Database Changes

When making changes that affect the database schema:

1. Update the migration scripts in the `scripts/` directory
2. Document the changes in your pull request
3. Test the migration process thoroughly

## Testing

- Add test cases for new features when possible
- Make sure existing tests pass before submitting your pull request

## Documentation

- Update the README.md if you change functionality
- Document new features, API endpoints, or configuration options

## License

By contributing your code, you agree to license your contribution under the [MIT License](LICENSE). 