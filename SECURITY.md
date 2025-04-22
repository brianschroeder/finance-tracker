# Security Policy

## Supported Versions

Currently, the latest version of Finance Tracker is being supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability within Finance Tracker, please report it by creating a new issue with the "security" label or by directly contacting the repository owner. 

Please include the following information in your report:

- A clear description of the vulnerability
- Steps to reproduce the issue
- Potential impact of the vulnerability
- Suggestions for addressing the issue (if possible)

We take all security vulnerabilities seriously and will respond to your report as quickly as possible.

## Security Best Practices

When using Finance Tracker, please follow these security best practices:

1. Keep your environment file (`.env.local`) secure and never commit it to version control
2. Regularly backup your database
3. For production deployments, consider using a more robust database solution
4. Keep your dependencies up to date by regularly running `npm audit` and updating packages

## Data Protection

Finance Tracker stores all your financial data locally. No data is sent to external servers unless you explicitly configure integrations with external services. 