# Frontend BDD Scenarios

This directory contains Gherkin feature files for BDD testing of the frontend application.

## Recommended BDD Frameworks

For React/TypeScript applications, consider these BDD frameworks:

### 1. Cucumber.js with Playwright (Recommended)

Best for end-to-end testing with real browser interactions.

```bash
npm install --save-dev @cucumber/cucumber playwright @playwright/test
```

### 2. Cucumber.js with Testing Library

Best for component-level BDD testing.

```bash
npm install --save-dev @cucumber/cucumber @testing-library/react @testing-library/jest-dom
```

### 3. Jest-Cucumber

Lightweight integration of Cucumber with Jest.

```bash
npm install --save-dev jest-cucumber @testing-library/react
```

## Directory Structure

```
scenarios/
├── README.md                  # This file
├── authentication.feature     # Authentication scenarios
├── file-upload.feature        # File upload scenarios
├── dashboard.feature          # Dashboard scenarios
├── navigation.feature         # Navigation scenarios
└── step-definitions/          # Step definition files (to be created)
    ├── common.steps.ts
    ├── authentication.steps.ts
    ├── file-upload.steps.ts
    ├── dashboard.steps.ts
    └── navigation.steps.ts
```

## Setup with Playwright + Cucumber

1. Install dependencies:

```bash
cd frontend
npm install --save-dev @cucumber/cucumber playwright @playwright/test ts-node typescript
```

2. Create `cucumber.js` configuration:

```javascript
module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['../scenarios/step-definitions/**/*.ts'],
    paths: ['../scenarios/**/*.feature'],
    format: ['progress-bar', 'html:reports/cucumber-report.html'],
  },
};
```

3. Create step definitions in `scenarios/step-definitions/`:

```typescript
// common.steps.ts
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

Given('I am logged in', async function () {
  // Set up authenticated session
  await this.page.goto('/');
  // Add authentication logic
});

Given('I am on the dashboard', async function () {
  await this.page.goto('/dashboard');
  await expect(this.page).toHaveURL(/dashboard/);
});
```

4. Add npm script to `package.json`:

```json
{
  "scripts": {
    "test:bdd": "cucumber-js"
  }
}
```

## Running Tests

```bash
# From frontend directory
npm run test:bdd

# Run specific feature
npm run test:bdd -- scenarios/authentication.feature

# Run with tags
npm run test:bdd -- --tags @smoke
```

## Writing Good Scenarios

### Use Given-When-Then Format

- **Given**: Set up the initial context
- **When**: Describe the action being tested
- **Then**: Assert the expected outcome

### Keep Scenarios Independent

Each scenario should be able to run in isolation without depending on other scenarios.

### Use Background for Common Setup

```gherkin
Background:
  Given I am logged in
  And I am on the dashboard
```

### Use Tags for Organization

```gherkin
@smoke @authentication
Scenario: Successfully login with Google OAuth
```

## Feature Files in This Directory

| File | Description |
|------|-------------|
| `authentication.feature` | OAuth login/logout flows |
| `file-upload.feature` | Drag-and-drop file uploads |
| `dashboard.feature` | Dashboard content management |
| `navigation.feature` | App navigation and routing |
