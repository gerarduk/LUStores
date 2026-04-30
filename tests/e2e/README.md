# End-to-End Testing with Playwright

This directory contains comprehensive end-to-end tests for the LUStores application using Playwright. These tests verify the complete user journey from button clicks to server responses and back to UI updates.

## Setup

### Installation

1. Install Playwright:
```bash
npm install
npx playwright install
```

### Running Tests

#### Local Development
```bash
# Run all e2e tests
npm run test:e2e-local

# Run tests in headed mode (see browser)
npm run test:e2e-headed

# Run tests in UI mode (interactive)
npm run test:e2e-ui

# Debug tests
npm run test:e2e-debug

# View test reports
npm run test:e2e-report
```

#### Docker Integration
```bash
# Run full integration tests with docker
npm run test:e2e
```

## Test Structure

### Test Files

- **`auth-navigation.spec.ts`** - Authentication flows and page navigation
- **`sales.spec.ts`** - Sales page button functionality and quote management
- **`inventory.spec.ts`** - Inventory management, file uploads, and CRUD operations
- **`dashboard.spec.ts`** - Dashboard widgets and real-time updates
- **`forms.spec.ts`** - Form validation and submission flows
- **`api-integration.spec.ts`** - API error handling and data flow
- **`full-stack.spec.ts`** - Complete end-to-end workflows

### Test Categories

#### 1. Button Functionality Tests
These tests specifically address the UI button issues mentioned:

- **Export Functions**: CSV exports, invoice generation
- **CRUD Operations**: Create, edit, delete items
- **Form Submissions**: Validation, error handling
- **File Uploads**: CSV import processing
- **Quote Management**: Add/remove items, save quotes

#### 2. API Integration Tests
Full stack verification from UI to server:

- **Request/Response Flow**: Button click → API call → UI update
- **Error Handling**: Server errors displayed to users
- **Data Synchronization**: Real-time updates
- **Performance**: Response times and load handling

#### 3. User Journey Tests
Complete workflows users perform:

- **Login to Dashboard**: Authentication and navigation
- **Create Sale**: Customer info → item selection → quote → save
- **Inventory Management**: Add items → upload CSV → view updates
- **Error Recovery**: Handle failures gracefully

## Test Utilities

### TestHelpers Class
Common functions for test automation:

```typescript
const helpers = new TestHelpers(page);

// Login with test credentials
await helpers.login('test@example.com', 'password');

// Fill item forms
await helpers.fillItemForm({
  name: 'Test Item',
  sku: 'TEST-001',
  price: '19.99'
});

// Wait for API calls
await helpers.waitForApiCalls();

// Check for success/error messages
await helpers.expectSuccess();
await helpers.expectNoErrors();
```

### ApiMocker Class
Mock API responses for testing edge cases:

```typescript
const apiMocker = new ApiMocker(page);

// Mock successful responses
await apiMocker.mockCreateItem({ id: 1, name: 'Test' });

// Mock error responses
await apiMocker.mockApiError('**/api/items', 500, 'Server error');

// Mock slow responses
await apiMocker.mockSlowResponse('**/api/items', 3000);
```

## Configuration

### Playwright Config (`playwright.config.ts`)

- **Browsers**: Chrome, Firefox, Safari, Mobile
- **Base URL**: `http://localhost:5000` (configurable)
- **Reporters**: HTML, JUnit, JSON
- **Screenshots**: On failure
- **Videos**: On retry
- **Traces**: On first retry

### Environment Variables

- `TEST_BASE_URL`: Base URL for testing (default: http://localhost:5000)
- `CI`: Enables CI-specific settings (retries, workers)

## Best Practices

### 1. Test Isolation
Each test starts with a clean state:
```typescript
test.beforeEach(async ({ page }) => {
  await helpers.navigateAndWait('/');
});
```

### 2. Robust Selectors
Use semantic selectors that won't break with UI changes:
```typescript
// Good
page.getByRole('button', { name: /save/i })
page.getByLabel(/customer name/i)

// Avoid
page.locator('.btn-primary')
page.locator('#save-btn')
```

### 3. Wait Strategies
Always wait for network and loading states:
```typescript
await page.waitForLoadState('networkidle');
await helpers.waitForApiCalls();
```

### 4. Error Handling
Test both happy path and error scenarios:
```typescript
// Test success case
await helpers.expectSuccess();

// Test error case
await apiMocker.mockApiError('**/api/items', 500);
await helpers.expectNoErrors(); // Should fail gracefully
```

## Debugging Tests

### Local Debugging
```bash
# Run in headed mode to see what's happening
npm run test:e2e-headed

# Use debug mode for step-by-step execution
npm run test:e2e-debug

# Generate traces for failed tests
npx playwright test --trace on
```

### CI/CD Integration
Tests run automatically in the CI pipeline:

1. **Pre-deployment**: Run critical user journeys
2. **Integration**: Test against staging environment
3. **Monitoring**: Continuous validation in production-like environment

## Common Issues and Solutions

### 1. Timing Issues
**Problem**: Tests fail due to race conditions
**Solution**: Use proper wait strategies
```typescript
await page.waitForLoadState('networkidle');
await expect(element).toBeVisible({ timeout: 10000 });
```

### 2. Flaky Tests
**Problem**: Tests pass/fail inconsistently
**Solution**: Add retries and better selectors
```typescript
// In playwright.config.ts
retries: process.env.CI ? 2 : 0
```

### 3. API Mocking
**Problem**: Tests depend on external services
**Solution**: Mock API responses
```typescript
await page.route('**/api/**', (route) => {
  route.fulfill({ json: mockData });
});
```

## Contributing

When adding new tests:

1. **Follow naming conventions**: `feature.spec.ts`
2. **Group related tests**: Use `test.describe()`
3. **Add documentation**: Comment complex test logic
4. **Test both paths**: Success and error scenarios
5. **Use utilities**: Leverage TestHelpers and ApiMocker classes

## Monitoring and Alerts

The test suite integrates with monitoring to alert on:

- **Critical user journeys failing**
- **Performance regressions**
- **API error rate increases**
- **Button functionality breaking**

Test results are reported to:
- JUnit XML for CI integration
- HTML reports for detailed analysis
- JSON for programmatic processing
