import { test, expect } from '@playwright/test';
import { generateBedMesh } from './helpers';
import { EXPECT_TIMEOUT, UI_TRANSITION_TIMEOUT } from './config';

/**
 * E2E Tests for the Leveling Page - Profile System
 *
 * Prerequisites:
 * - E2E testbed running (make -C e2e up)
 * - Application deployed (make -C e2e deploy)
 * - E2E_GEN_MESH_CMD environment variable set
 */

test.describe('Leveling Page - Profile System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to leveling page
    await page.goto('/leveling');
    // Wait for page to load
    await page.waitForSelector('text=Profile');
  });

  test.describe('Profile List and Selection', () => {
    test('should display profile dropdown with Current option', async ({ page }) => {
      const dropdown = page.locator('select').first();
      await expect(dropdown).toBeVisible();

      // Check that "Current" is selected by default
      const selectedOption = await dropdown.inputValue();
      expect(selectedOption).toBe('current');
    });

    test('should list existing profiles in dropdown', async ({ page }) => {
      const dropdown = page.locator('select').first();
      const options = dropdown.locator('option');

      // At minimum, Current should exist (options in select are not visible until opened)
      const optionCount = await options.count();
      expect(optionCount).toBeGreaterThanOrEqual(1);
      
      // Check for Current option text
      await expect(options.filter({ hasText: 'Current' })).toHaveCount(1);
    });
  });

  test.describe('Profile Creation', () => {
    test('should create new profile via Save As', async ({ page }) => {
      const profileName = `TestProfile${Date.now()}`;

      await page.getByRole('button', { name: /Save As/i }).click();
      
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: EXPECT_TIMEOUT });

      // New Profile radio should be checked by default
      const newProfileRadio = dialog.getByRole('radio', { name: /New Profile/i });
      await expect(newProfileRadio).toBeChecked();

      // Enter profile name - click first then fill
      const textbox = dialog.getByRole('textbox', { name: /Enter profile name/i });
      await textbox.click();
      await textbox.fill(profileName);
      
      // Verify the textbox has the value
      await expect(textbox).toHaveValue(profileName);

      // Click Save button in dialog
      await dialog.getByRole('button', { name: /^Save$/i }).click();

      // Wait for modal to close
      await expect(dialog).not.toBeVisible({ timeout: EXPECT_TIMEOUT });

      // Reload to ensure profile is persisted
      await page.reload();
      await page.waitForSelector('text=Profile');

      // New profile should appear in dropdown
      const dropdown = page.locator('select').first();
      const options = await dropdown.locator('option').allTextContents();
      expect(options.some(opt => opt.includes('TestProfile'))).toBeTruthy();
    });

    test('should show validation when saving without name', async ({ page }) => {
      await page.getByRole('button', { name: /Save As/i }).click();
      
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: EXPECT_TIMEOUT });

      // New Profile radio should be checked by default
      const newProfileRadio = dialog.getByRole('radio', { name: /New Profile/i });
      await expect(newProfileRadio).toBeChecked();

      // Clear the textbox
      const textbox = dialog.getByRole('textbox', { name: /Enter profile name/i });
      await textbox.clear();

      // Click Save - should show error notification
      await dialog.getByRole('button', { name: /^Save$/i }).click();

      // Should get error notification about name required
      await expect(page.locator('text=Name required')).toBeVisible({ timeout: EXPECT_TIMEOUT });
    });
  });

  test.describe('Profile Switching', () => {
    test('should switch to Backup profile', async ({ page }) => {
      const dropdown = page.locator('select').first();

      // Switch to Backup profile
      await dropdown.selectOption('1'); // Backup profile ID

      // Verify we're on Backup profile
      const selectedOption = await dropdown.inputValue();
      expect(selectedOption).toBe('1');
    });

    test('should switch back to Current profile', async ({ page }) => {
      const dropdown = page.locator('select').first();

      // First switch to Backup
      await dropdown.selectOption('1');

      // Then switch back to Current
      await dropdown.selectOption('current');

      const selectedOption = await dropdown.inputValue();
      expect(selectedOption).toBe('current');
    });
  });
});

test.describe('Leveling Page - Slot Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/leveling');
    await page.waitForSelector('text=Profile');
  });

  test.describe('Slot Creation', () => {
    test('should save active mesh to a slot', async ({ page }) => {
      const slotNumber = Math.floor(Math.random() * 90) + 10; // Random slot 10-99

      // Open save modal
      const activeMeshSection = page.locator('text=Active Mesh').locator('..');
      await activeMeshSection.getByRole('button', { name: 'Save' }).click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: EXPECT_TIMEOUT });

      // Enter slot number
      await dialog.getByRole('spinbutton', { name: /Slot Number/i }).fill(String(slotNumber));

      // Click Save
      await dialog.getByRole('button', { name: 'Save' }).click();

      // Wait for success toast
      await expect(page.locator(`text=saved to slot ${slotNumber}`)).toBeVisible({ timeout: EXPECT_TIMEOUT });

      // Slot should appear in saved meshes list
      await expect(page.locator(`.slot-name:has-text("Slot ${slotNumber}")`)).toBeVisible();
    });

    test('should save mesh, generate new mesh, save second slot', async ({ page }) => {
      // Save first mesh to slot 1
      const activeMeshSection = page.locator('text=Active Mesh').locator('..');
      await activeMeshSection.getByRole('button', { name: 'Save' }).click();
      
      let dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: EXPECT_TIMEOUT });
      await dialog.getByRole('spinbutton', { name: /Slot Number/i }).fill('1');
      await dialog.getByRole('button', { name: 'Save' }).click();
      await expect(page.locator('text=saved to slot 1')).toBeVisible({ timeout: EXPECT_TIMEOUT });

      // Generate new bed mesh
      await generateBedMesh();

      // Reload page to see new mesh
      await page.reload();
      await page.waitForSelector('text=Profile');

      // Save second mesh to slot 2
      const activeMeshSection2 = page.locator('text=Active Mesh').locator('..');
      await activeMeshSection2.getByRole('button', { name: 'Save' }).click();
      
      dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: EXPECT_TIMEOUT });
      await dialog.getByRole('spinbutton', { name: /Slot Number/i }).fill('2');
      await dialog.getByRole('button', { name: 'Save' }).click();
      await expect(page.locator('text=saved to slot 2')).toBeVisible({ timeout: EXPECT_TIMEOUT });

      // Both slots should be visible
      await expect(page.locator('.slot-name').filter({ hasText: /\bSlot 1\b/ })).toBeVisible();
      await expect(page.locator('.slot-name').filter({ hasText: /\bSlot 2\b/ })).toBeVisible();
    });
  });

  test.describe('Slot Deletion', () => {
    test.beforeEach(async ({ page }) => {
      // First generate a bed mesh to ensure there's active mesh data
      await generateBedMesh();
      
      // Reload page to see the new mesh
      await page.reload();
      await page.waitForSelector('text=Profile');
      
      // Create a slot (99) to ensure we have one to delete
      const slotNumber = 99;

      const activeMeshSection = page.locator('text=Active Mesh').locator('..');
      await activeMeshSection.getByRole('button', { name: 'Save' }).click();
      
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: EXPECT_TIMEOUT });
      await dialog.getByRole('spinbutton', { name: /Slot Number/i }).fill(String(slotNumber));
      await dialog.getByRole('button', { name: 'Save' }).click();
      
      // Wait for save to complete
      await expect(page.locator(`text=saved to slot ${slotNumber}`)).toBeVisible({ timeout: EXPECT_TIMEOUT });
    });

    test('should delete a slot after confirmation', async ({ page }) => {
      // Find slot 99's delete button
      const slotRow = page.locator('.slot-name:has-text("Slot 99")').locator('..');
      const deleteButton = slotRow.getByRole('button', { name: /delete/i });

      // Handle the confirmation dialog
      page.on('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        await dialog.accept();
      });

      await deleteButton.click();

      // Wait for slot to be removed
      await expect(page.locator('.slot-name:has-text("Slot 99")')).not.toBeVisible({ timeout: EXPECT_TIMEOUT });
    });

    test('should cancel slot deletion', async ({ page }) => {
      const slotRow = page.locator('.slot-name:has-text("Slot 99")').locator('..');
      const deleteButton = slotRow.getByRole('button', { name: /delete/i });

      // Handle the confirmation dialog - dismiss it
      page.on('dialog', async dialog => {
        await dialog.dismiss();
      });

      await deleteButton.click();

      // Slot should still exist
      await expect(page.locator('.slot-name:has-text("Slot 99")')).toBeVisible();
    });
  });
});

test.describe('Leveling Page - Profile Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/leveling');
    await page.waitForSelector('text=Profile');
  });

  test('should show list of profiles in manager', async ({ page }) => {
    await page.getByRole('button', { name: /Manage Profiles/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: EXPECT_TIMEOUT });

    // Should have at least Backup profile listed in the dialog
    await expect(dialog.locator('text=Backup')).toBeVisible({ timeout: EXPECT_TIMEOUT });
  });
});

test.describe('Leveling Page - Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/leveling');
    await page.waitForSelector('text=Leveling Settings');
  });

  test('should update grid size setting with confirmation modal', async ({ page }) => {
    const settingsForm = page.locator('.settings-form');

    // Find grid size input and change it
    const gridSizeInput = settingsForm.locator('input[type="number"]').first();
    const originalValue = await gridSizeInput.inputValue();
    const newValue = originalValue === '5' ? '6' : '5';
    await gridSizeInput.fill(newValue);

    // Click Save button
    const saveButton = settingsForm.locator('button:has-text("Save")');
    await saveButton.click();

    // Wait for confirmation modal with exact title
    await expect(page.locator('text=Confirm Grid Size Change')).toBeVisible({ timeout: EXPECT_TIMEOUT });

    // Verify destructive operation warning is shown
    await expect(page.locator('text=All saved mesh profiles will be deleted')).toBeVisible();

    // Click the Confirm button (danger button)
    const confirmButton = page.locator('button:has-text("Confirm")');
    await confirmButton.click();

    // Wait for success message
    await expect(page.locator('text=/Settings saved|success/i')).toBeVisible({ timeout: EXPECT_TIMEOUT });

    // Verify the grid size was actually updated by reloading and checking
    await page.reload();
    await page.waitForSelector('.settings-form');
    const updatedGridSizeInput = page.locator('.settings-form input[type="number"]').first();
    await expect(updatedGridSizeInput).toHaveValue(newValue);

    // Verify mesh was zeroed (all values should be 0.000000)
    const meshTable = page.locator('table');
    await expect(meshTable).toBeVisible();
    const cells = meshTable.locator('td');
    const cellCount = await cells.count();
    // Check first few cells are zero
    for (let i = 0; i < Math.min(5, cellCount); i++) {
      const cellText = await cells.nth(i).textContent();
      expect(cellText?.trim()).toMatch(/^0\.0+$/);
    }
  });

  test('should update bed temperature setting', async ({ page }) => {
    const settingsForm = page.locator('.settings-form');

    // Find bed temp input (second number input)
    const bedTempInput = settingsForm.locator('input[type="number"]').nth(1);
    await bedTempInput.fill('65');

    // Click Save button
    const saveButton = settingsForm.locator('button:has-text("Save")');
    await saveButton.click();

    // Wait for success message
    await expect(page.locator('text=/Settings updated|success/i')).toBeVisible({ timeout: EXPECT_TIMEOUT });

    // Verify the bed temperature was actually updated
    await page.reload();
    await page.waitForSelector('.settings-form');
    const updatedBedTempInput = page.locator('.settings-form input[type="number"]').nth(1);
    await expect(updatedBedTempInput).toHaveValue('65');
  });

  test('should maintain separate settings per profile', async ({ page }) => {
    const settingsForm = page.locator('.settings-form');
    
    // Get current profile's bed temp
    const currentBedTempInput = settingsForm.locator('input[type="number"]').nth(1);
    const currentBedTemp = await currentBedTempInput.inputValue();
    
    // Switch to Backup profile (ID 1)
    const dropdown = page.locator('select').first();
    await dropdown.selectOption('1');
    
    // Wait for bed temp input to update with Backup profile's value
    const backupBedTempInput = settingsForm.locator('input[type="number"]').nth(1);
    await backupBedTempInput.waitFor({ state: 'visible', timeout: UI_TRANSITION_TIMEOUT + EXPECT_TIMEOUT });
    
    // Change bed temp on Backup profile to a different value
    const backupBedTemp = currentBedTemp === '60' ? '65' : '60';
    await backupBedTempInput.fill(backupBedTemp);
    
    // Save settings for Backup profile
    const saveButton = settingsForm.locator('button:has-text("Save")');
    await saveButton.click();
    await expect(page.locator('text=/Settings updated|success/i')).toBeVisible({ timeout: EXPECT_TIMEOUT });
    
    // Switch back to Current profile
    await dropdown.selectOption('current');
    
    // Verify Current profile still has its original bed temp (not Backup's value)
    const currentBedTempAfterSwitch = settingsForm.locator('input[type="number"]').nth(1);
    await expect(currentBedTempAfterSwitch).toHaveValue(currentBedTemp, { timeout: UI_TRANSITION_TIMEOUT + EXPECT_TIMEOUT });
    
    // Switch back to Backup and verify it kept the changed value
    await dropdown.selectOption('1');
    const backupBedTempAfterSwitch = settingsForm.locator('input[type="number"]').nth(1);
    await expect(backupBedTempAfterSwitch).toHaveValue(backupBedTemp, { timeout: UI_TRANSITION_TIMEOUT + EXPECT_TIMEOUT });
  });
});
