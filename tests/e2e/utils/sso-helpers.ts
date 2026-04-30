import { Page, expect } from '@playwright/test';

/**
 * SSO Test Helper Utilities
 * Provides environment-aware SSO testing capabilities
 */

export interface SSOStatus {
  ssoConfigured: boolean;
}

/**
 * Get the current SSO configuration status from the API
 */
export async function getSSOStatus(page: Page): Promise<SSOStatus> {
  const response = await page.request.get('/api/auth/sso-status');
  expect(response.ok()).toBe(true);
  const ssoStatus = await response.json();
  
  // Validate response structure
  expect(ssoStatus).toHaveProperty('ssoConfigured');
  expect(typeof ssoStatus.ssoConfigured).toBe('boolean');
  
  return ssoStatus;
}

/**
 * Check if SSO is configured in the current environment
 * This can be used to conditionally skip SSO-specific tests
 */
export async function isSSOConfigured(page: Page): Promise<boolean> {
  const ssoStatus = await getSSOStatus(page);
  return ssoStatus.ssoConfigured;
}

/**
 * Verify SSO button visibility matches the SSO configuration
 */
export async function verifySSOButtonVisibility(page: Page): Promise<void> {
  const ssoStatus = await getSSOStatus(page);
  const ssoButton = page.locator('button:has-text("Sign in with University Account")');
  const ssoButtonVisible = await ssoButton.isVisible();
  
  // console.log(`🎓 SSO configured: ${ssoStatus.ssoConfigured}`);
  // console.log(`🎓 SSO button visible: ${ssoButtonVisible}`);
  
  if (ssoStatus.ssoConfigured) {
    // SSO is configured - button should be visible
    if (ssoButtonVisible) {
      console.log('✅ PASS: SSO button correctly visible when SSO is configured');
    } else {
      console.log('❌ FAIL: SSO button should be visible when SSO is configured');
      await page.screenshot({ path: 'sso-button-incorrectly-hidden.png' });
    }
    expect(ssoButtonVisible).toBe(true);
  } else {
    // SSO is not configured - button should be hidden
    if (ssoButtonVisible) {
      console.log('❌ FAIL: SSO button should be hidden when SSO is not configured');
      await page.screenshot({ path: 'sso-button-incorrectly-visible.png' });
    } else {
      console.log('✅ PASS: SSO button correctly hidden when SSO is not configured');
    }
    expect(ssoButtonVisible).toBe(false);
  }
}

/**
 * Verify that email/password login is always available regardless of SSO configuration
 */
export async function verifyEmailPasswordLoginAvailable(page: Page): Promise<void> {
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  const loginButton = page.locator('button[type="submit"]');
  
  expect(await emailInput.isVisible()).toBe(true);
  expect(await passwordInput.isVisible()).toBe(true);
  expect(await loginButton.isVisible()).toBe(true);
  
  // console.log('✅ Email/password login form is correctly visible');
}

/**
 * Environment variable check for SSO configuration
 * This can be used in test setup to determine if SSO tests should run
 */
export function checkSSOEnvironmentVariables(): boolean {
  const requiredSSOVars = [
    'SAML_ENTRY_POINT',
    'SAML_ISSUER', 
    'SAML_CALLBACK_URL',
    'SAML_CERT',
    'SESSION_SECRET'
  ];
  
  const missingVars = requiredSSOVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log(`⚠️  Missing SSO environment variables: ${missingVars.join(', ')}`);
    console.log('🔧 SSO tests will be skipped or run in local-auth-only mode');
    return false;
  }
  
  // console.log('✅ All SSO environment variables are configured');
  return true;
}
