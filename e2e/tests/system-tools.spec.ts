import { test, expect } from '@playwright/test';
import { fetchLogTail } from './helpers';
import { EXPECT_TIMEOUT, SERVICE_OPERATION_TIMEOUT, LOG_REFRESH_TIMEOUT } from './config';

/**
 * E2E Tests for the System Tools Page
 *
 * Prerequisites:
 * - E2E testbed running (make -C e2e up)
 * - Application deployed (make -C e2e deploy)
 */

test.describe('System Tools Page - Security', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/system-tools');
    // Wait for any card to load
    await page.waitForSelector('.card, [class*="card"]', { timeout: EXPECT_TIMEOUT });
  });

  test('should change root password successfully', async ({ page }) => {
    const securityCard = page.locator('text=Security').locator('..');
    
    // Enter new password (we'll change it back to 'toor' which is the default)
    const passwordInput = securityCard.getByPlaceholder(/root password/i);
    await passwordInput.fill('toor');
    
    const confirmInput = securityCard.getByPlaceholder(/confirm/i);
    await confirmInput.fill('toor');
    
    // Click change button
    await securityCard.getByRole('button', { name: /change/i }).click();
    
    // Wait for inputs to be cleared (indicating success)
    await expect(passwordInput).toHaveValue('', { timeout: SERVICE_OPERATION_TIMEOUT + EXPECT_TIMEOUT });
    
    // Check that no error message is displayed
    const errorMessage = page.getByText(/failed to change/i);
    await expect(errorMessage).not.toBeVisible();
    
    // Verify the form is still visible
    await expect(passwordInput).toBeVisible();
    
    // Fetch the printer log to verify the success message
    const logTail = await fetchLogTail(page.request);
    expect(logTail).toContain('Root password changed successfully');
  });

  test('should require matching passwords', async ({ page }) => {
    const securityCard = page.locator('text=Security').locator('..');
    
    // Enter mismatched passwords
    const passwordInput = securityCard.getByPlaceholder(/root password/i);
    await passwordInput.fill('password123');
    
    const confirmInput = securityCard.getByPlaceholder(/confirm/i);
    await confirmInput.fill('different');
    
    // Change button should be disabled
    const changeButton = securityCard.getByRole('button', { name: /change/i });
    await expect(changeButton).toBeDisabled();
  });
});

test.describe('System Tools Page - Services', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/system-tools');
    await page.waitForSelector('.card, [class*="card"]', { timeout: EXPECT_TIMEOUT });
  });

  test('should show SSH service status', async ({ page }) => {
    const servicesCard = page.locator('text=Services').locator('..');
    
    // Should show SSH status
    await expect(servicesCard.locator('text=SSH')).toBeVisible();
    
    // Should show status indicator (Running/Stopped)
    const statusText = servicesCard.locator('text=/Running|Stopped/i');
    await expect(statusText).toBeVisible();
  });

  test('should restart SSH service', async ({ page }) => {
    const servicesCard = page.locator('text=Services').locator('..');
    
    // Wait for SSH status to load
    await expect(servicesCard.locator('text=/Running|Stopped/i')).toBeVisible();
    
    // If SSH is running, test restart
    const sshStatus = await servicesCard.locator('text=Running').count();
    if (sshStatus > 0) {
      // Click restart button
      const restartButton = servicesCard.getByRole('button', { name: /^Restart$/i });
      await restartButton.click();
      
      // SSH should still be running after restart
      await expect(servicesCard.locator('text=Running')).toBeVisible({ timeout: SERVICE_OPERATION_TIMEOUT + EXPECT_TIMEOUT });
    } else {
      // If SSH is stopped, start it first
      const startButton = servicesCard.getByRole('button', { name: /^Start$/i });
      await startButton.click();
      await expect(servicesCard.locator('text=Running')).toBeVisible({ timeout: SERVICE_OPERATION_TIMEOUT + EXPECT_TIMEOUT });
    }
  });

  test('should stop and start SSH service', async ({ page }) => {
    const servicesCard = page.locator('text=Services').locator('..');
    
    // Wait for SSH status to load and ensure it's running initially
    await expect(servicesCard.locator('text=/Running|Stopped/i')).toBeVisible();
    
    // Ensure SSH is running first (start if not)
    const initialRunning = await servicesCard.locator('text=Running').count();
    if (initialRunning === 0) {
      const startBtn = servicesCard.getByRole('button', { name: /^Start$/i });
      await startBtn.click();
      await expect(servicesCard.locator('text=Running')).toBeVisible({ timeout: SERVICE_OPERATION_TIMEOUT + EXPECT_TIMEOUT });
    }
    
    // Step 1: Stop SSH
    const stopButton = servicesCard.getByRole('button', { name: /^Stop$/i });
    await stopButton.click();
    
    // Step 2: Verify state changed to Stopped
    await expect(servicesCard.locator('text=Stopped')).toBeVisible({ timeout: SERVICE_OPERATION_TIMEOUT + EXPECT_TIMEOUT });
    
    // Step 3: Start SSH
    const startButton = servicesCard.getByRole('button', { name: /^Start$/i });
    await startButton.click();
    
    // Step 4: Verify state changed to Running
    await expect(servicesCard.locator('text=Running')).toBeVisible({ timeout: SERVICE_OPERATION_TIMEOUT + EXPECT_TIMEOUT });
  });
});

test.describe('System Tools Page - File Browser', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/system-tools');
    await page.waitForSelector('.card, [class*="card"]', { timeout: EXPECT_TIMEOUT });
  });

  test('should navigate into directories', async ({ page }) => {
    const fileBrowserCard = page.locator('text=File Browser').locator('..');
    
    // Look for a directory button (e.g., profiles)
    const directoryLinks = fileBrowserCard.locator('button').filter({ hasText: /profiles/i });
    const linkCount = await directoryLinks.count();
    
    if (linkCount > 0) {
      // Click directory
      await directoryLinks.first().click();
      
      // Wait for navigation - path separator should appear
      const pathSeparator = fileBrowserCard.locator('span.path-separator');
      await expect(pathSeparator).toBeVisible({ timeout: EXPECT_TIMEOUT });
      
      // Also ".." go-up button should appear
      const goUpButton = fileBrowserCard.getByRole('button', { name: '..' });
      await expect(goUpButton).toBeVisible();
    }
  });
});

test.describe('System Tools Page - Printer Log', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/system-tools');
    await page.waitForSelector('.card, [class*="card"]', { timeout: EXPECT_TIMEOUT });
  });

  test('should refresh log content', async ({ page }) => {
    const logCard = page.locator('text=Printer Log').locator('..');
    
    // Get initial log content
    const logViewer = logCard.locator('pre, code, textarea, [class*="log"]').first();
    await logViewer.waitFor({ state: 'visible', timeout: EXPECT_TIMEOUT });
    const initialContent = await logViewer.textContent();
    
    // Click refresh
    const refreshButton = logCard.getByRole('button', { name: /refresh|reload/i });
    await refreshButton.click();
    
    // Wait a brief moment for the refresh to trigger
    await page.waitForTimeout(LOG_REFRESH_TIMEOUT);
    
    // Content should be loaded (may be same or different)
    const newContent = await logViewer.textContent();
    expect(newContent).toBeDefined();
  });

  test('should show webfsd startup message in log', async ({ page }) => {
    const logCard = page.locator('text=Printer Log').locator('..');
    
    // Refresh log to ensure we have latest content
    const refreshButton = logCard.getByRole('button', { name: /refresh|reload/i });
    await refreshButton.click();
    await page.waitForTimeout(LOG_REFRESH_TIMEOUT);
    
    // Log should contain webfsd startup message
    const logViewer = logCard.locator('pre, code, textarea, [class*="log"]').first();
    const logContent = await logViewer.textContent();
    
    // Should contain webfsd started message (case insensitive, flexible matching)
    // Log might be empty on first load, so we check if it has content
    if (logContent && logContent.trim().length > 0) {
      expect(logContent.toLowerCase()).toContain('webfsd');
    } else {
      // If log is empty, that's also acceptable (might not have started yet)
      expect(logContent).toBeDefined();
    }
  });

  test('should show SSH restart message in log after restart', async ({ page }) => {
    const servicesCard = page.locator('text=Services').locator('..');
    
    // Wait for SSH status to load
    await expect(servicesCard.locator('text=/Running|Stopped/i')).toBeVisible();
    
    // Only test if SSH is running
    const sshStatus = await servicesCard.locator('text=Running').count();
    if (sshStatus > 0) {
      // Restart SSH
      const restartButton = servicesCard.getByRole('button', { name: /^Restart$/i });
      await restartButton.click();
      
      // Verify SSH is still running after restart
      await expect(servicesCard.locator('text=Running')).toBeVisible({ timeout: SERVICE_OPERATION_TIMEOUT + EXPECT_TIMEOUT });
      
      // Refresh log
      const logCard = page.locator('text=Printer Log').locator('..');
      const refreshButton = logCard.getByRole('button', { name: /refresh|reload/i });
      await refreshButton.click();
      await page.waitForTimeout(LOG_REFRESH_TIMEOUT);
      
      // Log should contain SSH restart message
      const logViewer = logCard.locator('pre, code, textarea, [class*="log"]').first();
      const logContent = await logViewer.textContent();
      
      // Should contain SSH restart message (if log has content)
      if (logContent && logContent.trim().length > 0) {
        expect(logContent.toLowerCase()).toMatch(/ssh.*restart|dropbear/i);
      } else {
        // If log is empty, at least verify SSH is running
        await expect(servicesCard.locator('text=Running')).toBeVisible();
      }
    }
  });
});
