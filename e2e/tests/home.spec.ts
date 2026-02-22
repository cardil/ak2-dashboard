import { test, expect } from '@playwright/test';
import { EXPECT_TIMEOUT } from './config';

test.describe('Home Page - System Stats', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for stats grid to load (indicates API data is ready)
    await page.waitForSelector('.stats-grid', { timeout: EXPECT_TIMEOUT });
  });

  test('should display memory information', async ({ page }) => {
    // Memory stats: "XX% of YY MB" format
    const memoryText = page.getByText(/\d+%\s*of\s*\d+\s*MB/i);
    await expect(memoryText.first()).toBeVisible();
  });

  test('should display CPU usage', async ({ page }) => {
    // CPU label should be displayed
    const cpuLabel = page.getByText('CPU Used');
    await expect(cpuLabel).toBeVisible();
    // CPU value should show percentage
    const cpuValue = page.getByText(/^\d+%$/);
    await expect(cpuValue.first()).toBeVisible();
  });

  test('should display uptime', async ({ page }) => {
    // Uptime label should be visible
    const uptimeLabel = page.getByText('Uptime');
    await expect(uptimeLabel).toBeVisible();
    // Uptime value in "Xh Ym Zs" or "Xm Ys" or "Xs" format
    const uptimeValue = page.getByText(/\d+[hdms]/);
    await expect(uptimeValue.first()).toBeVisible();
  });

  test('should display SSH status', async ({ page }) => {
    // SSH label should be visible
    const sshLabel = page.getByText(/^SSH$/);
    await expect(sshLabel).toBeVisible();
    // SSH status should show Started, Stopped, or N/A
    const sshStatus = page.getByText(/^(Started|Stopped|N\/A)$/);
    await expect(sshStatus.first()).toBeVisible();
  });
});

test.describe('Home Page - API Integration', () => {
  test('should fetch /api/system endpoint directly', async ({ page }) => {
    // Directly test the API endpoint
    const response = await page.request.get('/api/system');
    
    expect(response.status()).toBe(200);
    
    // Verify response has expected fields
    const data = await response.json();
    expect(data).toHaveProperty('total_mem');
    expect(data).toHaveProperty('free_mem');
    expect(data).toHaveProperty('cpu_use');
    expect(data).toHaveProperty('uptime');
    expect(data).toHaveProperty('ssh_status');
  });

  test('should display data from /api/system on the page', async ({ page }) => {
    // First get the API data
    const response = await page.request.get('/api/system');
    const data = await response.json();
    
    // Navigate to the page
    await page.goto('/');
    // Wait for stats grid to ensure data is loaded
    await page.waitForSelector('.stats-grid', { timeout: EXPECT_TIMEOUT });
    
    // The SSH status from API should appear on the page
    const expectedSshStatus = data.ssh_status == 2 ? 'Started' : data.ssh_status == 1 ? 'Stopped' : 'N/A';
    const sshStatusText = page.getByText(expectedSshStatus);
    await expect(sshStatusText.first()).toBeVisible();
    
    // Memory info should be displayed
    const memoryText = page.getByText(/\d+%\s*of\s*\d+\s*MB/i);
    await expect(memoryText.first()).toBeVisible();
  });
});
