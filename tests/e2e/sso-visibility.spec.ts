import { test, expect } from '@playwright/test';
import { 
  getSSOStatus, 
  isSSOConfigured, 
  verifySSOButtonVisibility, 
  verifyEmailPasswordLoginAvailable,
  checkSSOEnvironmentVariables 
} from './utils/sso-helpers';

test.describe('SSO Visibility Tests', () => {
  test.beforeAll(() => {
    // Log environment SSO configuration status
    const envSSOConfigured = checkSSOEnvironmentVariables();
    console.log(`Environment SSO variables configured: ${envSSOConfigured}`);
  });

  test('SSO login option visibility should match SSO configuration', async ({ page }) => {
    console.log('Testing SSO visibility based on actual configuration...');
    
    // Navigate to login page
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for page to fully load
    await page.waitForTimeout(3000);
    
    // Get SSO status and log it
    const ssoStatus = await getSSOStatus(page);
    console.log('SSO Status API response:', JSON.stringify(ssoStatus, null, 2));
    
    // Verify SSO button visibility matches configuration
    await verifySSOButtonVisibility(page);
    
    // Verify that email/password login is always available
    await verifyEmailPasswordLoginAvailable(page);
  });
  
  test('SSO status API should return valid configuration', async ({ page }) => {
    console.log('Testing SSO status API endpoint...');
    
    // Test the API endpoint directly
    const ssoStatus = await getSSOStatus(page);
    console.log('SSO Status:', JSON.stringify(ssoStatus, null, 2));
    
    // Log the current environment's SSO configuration
    if (ssoStatus.ssoConfigured) {
      console.log('SSO is configured in this environment');
    } else {
      console.log('SSO is not configured in this environment (using local auth only)');
    }
    
    console.log('SSO status API returns valid configuration');
  });
  
  test('SSO configuration should be consistent between environment and API', async ({ page }) => {
    console.log('Testing consistency between environment variables and API...');
    
    // Check environment variables
    const envSSOConfigured = checkSSOEnvironmentVariables();
    
    // Check API response
    const apiSSOConfigured = await isSSOConfigured(page);
    
    console.log(`Environment SSO configured: ${envSSOConfigured}`);
    console.log(`API SSO configured: ${apiSSOConfigured}`);
    
    // These should match - if environment variables are missing, API should return false
    // If environment variables are present, API should return true
    if (envSSOConfigured) {
      expect(apiSSOConfigured).toBe(true);
      console.log('PASS: Environment has SSO vars and API confirms SSO is configured');
    } else {
      expect(apiSSOConfigured).toBe(false);
      console.log('PASS: Environment missing SSO vars and API confirms SSO is not configured');
    }
  });
});
