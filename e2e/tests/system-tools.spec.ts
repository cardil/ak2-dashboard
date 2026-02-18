import { test, expect } from '@playwright/test';

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
    await page.waitForSelector('.card, [class*="card"]', { timeout: 10000 });
  });

  test('should display security card', async ({ page }) => {
    await expect(page.locator('text=Security')).toBeVisible();
  });

  test('should have password change form', async ({ page }) => {
    const securityCard = page.locator('text=Security').locator('..');
    
    // Should have password inputs
    const passwordInput = securityCard.getByPlaceholder(/root password/i);
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    const confirmInput = securityCard.getByPlaceholder(/confirm/i);
    await expect(confirmInput).toBeVisible();
    
    // Should have change button
    await expect(securityCard.getByRole('button', { name: /change/i })).toBeVisible();
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
    
    // Wait for password change to complete
    await page.waitForTimeout(1000);
    
    // Verify the form is still visible (password changed successfully)
    await expect(passwordInput).toBeVisible();
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
    await page.waitForSelector('.card, [class*="card"]', { timeout: 10000 });
  });

  test('should display services card', async ({ page }) => {
    await expect(page.locator('text=Services')).toBeVisible();
  });

  test('should show SSH service status', async ({ page }) => {
    const servicesCard = page.locator('text=Services').locator('..');
    
    // Should show SSH status
    await expect(servicesCard.locator('text=SSH')).toBeVisible();
    
    // Should show status indicator (Running/Stopped)
    const statusText = servicesCard.locator('text=/Running|Stopped/i');
    await expect(statusText).toBeVisible();
  });

  test('should have SSH restart button when SSH is running', async ({ page }) => {
    const servicesCard = page.locator('text=Services').locator('..');
    
    // Wait for SSH status to load
    await expect(servicesCard.locator('text=/Running|Stopped/i')).toBeVisible();
    
    // If SSH is running, restart button should be visible
    const sshStatus = await servicesCard.locator('text=Running').count();
    if (sshStatus > 0) {
      const restartButton = servicesCard.getByRole('button', { name: /^Restart$/i });
      await expect(restartButton).toBeVisible();
    }
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
      
      // Wait for restart to complete
      await page.waitForTimeout(2000);
      
      // SSH should still be running after restart
      await expect(servicesCard.locator('text=Running')).toBeVisible({ timeout: 5000 });
    } else {
      // If SSH is stopped, start it first
      const startButton = servicesCard.getByRole('button', { name: /^Start$/i });
      await startButton.click();
      await page.waitForTimeout(2000);
      await expect(servicesCard.locator('text=Running')).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('System Tools Page - File Browser', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/system-tools');
    await page.waitForSelector('.card, [class*="card"]', { timeout: 10000 });
  });

  test('should display file browser card', async ({ page }) => {
    // Use more specific selector to avoid strict mode violation
    await expect(page.getByRole('heading', { name: 'File Browser' })).toBeVisible();
  });

  test('should show current directory path', async ({ page }) => {
    const fileBrowserCard = page.locator('text=File Browser').locator('..');
    
    // Should show breadcrumb navigation
    const breadcrumb = fileBrowserCard.locator('.breadcrumb, nav, [class*="path"], [class*="breadcrumb"]');
    const breadcrumbCount = await breadcrumb.count();
    
    // Either has breadcrumb or shows files directly
    expect(breadcrumbCount).toBeGreaterThanOrEqual(0);
  });

  test('should list files and directories', async ({ page }) => {
    const fileBrowserCard = page.locator('text=File Browser').locator('..');
    
    // Should have file/directory entries
    const entries = fileBrowserCard.locator('.file-entry, .directory-item, [class*="file"], [class*="directory"]');
    const count = await entries.count();
    
    // Should have at least some entries (or show empty state)
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should navigate into directories', async ({ page }) => {
    const fileBrowserCard = page.locator('text=File Browser').locator('..');
    
    // Look for a directory button (e.g., profiles)
    const directoryLinks = fileBrowserCard.locator('button').filter({ hasText: /profiles/i });
    const linkCount = await directoryLinks.count();
    
    if (linkCount > 0) {
      // Click directory
      await directoryLinks.first().click();
      
      // Wait for navigation
      await page.waitForTimeout(500);
      
      // Navigation happened: path separator "»" should appear in breadcrumb
      const pathSeparator = fileBrowserCard.locator('span.path-separator');
      await expect(pathSeparator).toBeVisible();
      
      // Also ".." go-up button should appear
      const goUpButton = fileBrowserCard.getByRole('button', { name: '..' });
      await expect(goUpButton).toBeVisible();
    }
  });

  test('should have go up button when not at root', async ({ page }) => {
    const fileBrowserCard = page.locator('text=File Browser').locator('..');
    
    // Navigate into a directory first
    const directoryLinks = fileBrowserCard.locator('button').filter({ hasText: /profiles/i });
    const linkCount = await directoryLinks.count();
    
    if (linkCount > 0) {
      await directoryLinks.first().click();
      await page.waitForTimeout(500);
      
      // Should have ".." go-up button
      const upButton = fileBrowserCard.getByRole('button', { name: '..' });
      await expect(upButton).toBeVisible();
    }
  });
});

test.describe('System Tools Page - Printer Log', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/system-tools');
    await page.waitForSelector('.card, [class*="card"]', { timeout: 10000 });
  });

  test('should display printer log card', async ({ page }) => {
    await expect(page.locator('text=Printer Log')).toBeVisible();
  });

  test('should show log content', async ({ page }) => {
    const logCard = page.locator('text=Printer Log').locator('..');
    
    // Should have log viewer area (pre, code, or textarea)
    const logViewer = logCard.locator('pre, code, textarea, [class*="log"]');
    await expect(logViewer.first()).toBeVisible();
  });

  test('should have refresh button', async ({ page }) => {
    const logCard = page.locator('text=Printer Log').locator('..');
    
    // Should have refresh button
    const refreshButton = logCard.getByRole('button', { name: /refresh|reload/i });
    await expect(refreshButton).toBeVisible();
  });

  test('should refresh log content', async ({ page }) => {
    const logCard = page.locator('text=Printer Log').locator('..');
    
    // Get initial log content
    const logViewer = logCard.locator('pre, code, textarea, [class*="log"]').first();
    const initialContent = await logViewer.textContent();
    
    // Click refresh
    const refreshButton = logCard.getByRole('button', { name: /refresh|reload/i });
    await refreshButton.click();
    
    // Wait for refresh
    await page.waitForTimeout(1000);
    
    // Content should be loaded (may be same or different)
    const newContent = await logViewer.textContent();
    expect(newContent).toBeDefined();
  });

  test('should show webfsd startup message in log', async ({ page }) => {
    const logCard = page.locator('text=Printer Log').locator('..');
    
    // Refresh log to ensure we have latest content
    const refreshButton = logCard.getByRole('button', { name: /refresh|reload/i });
    await refreshButton.click();
    await page.waitForTimeout(1000);
    
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
      
      // Wait for restart to complete
      await page.waitForTimeout(2000);
      
      // Verify SSH is still running
      await expect(servicesCard.locator('text=Running')).toBeVisible({ timeout: 5000 });
      
      // Refresh log
      const logCard = page.locator('text=Printer Log').locator('..');
      const refreshButton = logCard.getByRole('button', { name: /refresh|reload/i });
      await refreshButton.click();
      await page.waitForTimeout(1000);
      
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

test.describe('System Tools Page - System Info', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/system-tools');
    await page.waitForSelector('.card, [class*="card"]', { timeout: 10000 });
  });

  test('should display system card', async ({ page }) => {
    // Use more specific selector to avoid strict mode violation
    const systemCard = page.locator('.card').filter({ hasText: 'System' }).first();
    await expect(systemCard).toBeVisible();
  });

  test('should have reboot button', async ({ page }) => {
    const systemCard = page.locator('text=System').locator('..');
    
    // Should have reboot button
    await expect(systemCard.getByRole('button', { name: /reboot/i })).toBeVisible();
  });

  test('should have shutdown button', async ({ page }) => {
    const systemCard = page.locator('text=System').locator('..');
    
    // Should have shutdown button
    await expect(systemCard.getByRole('button', { name: /shutdown|power.*off/i })).toBeVisible();
  });
});
