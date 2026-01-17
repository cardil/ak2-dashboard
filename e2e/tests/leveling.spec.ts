import { test, expect } from '@playwright/test';
import { generateBedMesh } from './helpers';

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
    test('should open Save As modal when clicking Save As button', async ({ page }) => {
      // Button has accessible name "Save As..." but contains only an icon
      await page.getByRole('button', { name: /Save As/i }).click();

      // Modal should appear - wait explicitly for dialog with title
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 5000 });
      await expect(dialog.getByRole('heading')).toBeVisible();
    });

    test('should create new profile via Save As', async ({ page }) => {
      const profileName = `TestProfile${Date.now()}`;

      await page.getByRole('button', { name: /Save As/i }).click();
      
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 5000 });

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

      // Wait for modal to close and success toast
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
      
      // Wait for success or check dropdown
      await page.waitForTimeout(500);

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
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // New Profile radio should be checked by default
      const newProfileRadio = dialog.getByRole('radio', { name: /New Profile/i });
      await expect(newProfileRadio).toBeChecked();

      // Clear the textbox
      const textbox = dialog.getByRole('textbox', { name: /Enter profile name/i });
      await textbox.clear();

      // Click Save - should show error notification
      await dialog.getByRole('button', { name: /^Save$/i }).click();

      // Should get error notification about name required
      await expect(page.locator('text=Name required')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Profile Switching', () => {
    test('should switch to Backup profile', async ({ page }) => {
      const dropdown = page.locator('select').first();

      // Switch to Backup profile
      await dropdown.selectOption('1'); // Backup profile ID

      // Wait for data to load
      await page.waitForTimeout(1000);

      // Verify we're on Backup profile
      const selectedOption = await dropdown.inputValue();
      expect(selectedOption).toBe('1');
    });

    test('should switch back to Current profile', async ({ page }) => {
      const dropdown = page.locator('select').first();

      // First switch to Backup
      await dropdown.selectOption('1');
      await page.waitForTimeout(500);

      // Then switch back to Current
      await dropdown.selectOption('current');
      await page.waitForTimeout(500);

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
    test('should open Save Mesh modal when clicking Save on Active Mesh', async ({ page }) => {
      // Find the Active Mesh Save button
      const activeMeshSection = page.locator('text=Active Mesh').locator('..');
      const saveButton = activeMeshSection.getByRole('button', { name: 'Save' });

      await saveButton.click();

      // Modal should appear - use getByRole for dialog
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 5000 });
      await expect(dialog.locator('text=Save Active Mesh')).toBeVisible();
    });

    test('should save active mesh to a slot', async ({ page }) => {
      const slotNumber = Math.floor(Math.random() * 90) + 10; // Random slot 10-99

      // Open save modal
      const activeMeshSection = page.locator('text=Active Mesh').locator('..');
      await activeMeshSection.getByRole('button', { name: 'Save' }).click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Enter slot number
      await dialog.getByRole('spinbutton', { name: /Slot Number/i }).fill(String(slotNumber));

      // Click Save
      await dialog.getByRole('button', { name: 'Save' }).click();

      // Wait for success toast
      await expect(page.locator(`text=saved to slot ${slotNumber}`)).toBeVisible({ timeout: 5000 });

      // Slot should appear in saved meshes list
      await expect(page.locator(`.slot-name:has-text("Slot ${slotNumber}")`)).toBeVisible();
    });

    test('should save mesh, generate new mesh, save second slot', async ({ page }) => {
      // Save first mesh to slot 1
      const activeMeshSection = page.locator('text=Active Mesh').locator('..');
      await activeMeshSection.getByRole('button', { name: 'Save' }).click();
      
      let dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 5000 });
      await dialog.getByRole('spinbutton', { name: /Slot Number/i }).fill('1');
      await dialog.getByRole('button', { name: 'Save' }).click();
      await expect(page.locator('text=saved to slot 1')).toBeVisible({ timeout: 5000 });

      // Generate new bed mesh
      await generateBedMesh();

      // Reload page to see new mesh
      await page.reload();
      await page.waitForSelector('text=Profile');

      // Save second mesh to slot 2
      const activeMeshSection2 = page.locator('text=Active Mesh').locator('..');
      await activeMeshSection2.getByRole('button', { name: 'Save' }).click();
      
      dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 5000 });
      await dialog.getByRole('spinbutton', { name: /Slot Number/i }).fill('2');
      await dialog.getByRole('button', { name: 'Save' }).click();
      await expect(page.locator('text=saved to slot 2')).toBeVisible({ timeout: 5000 });

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
      await expect(dialog).toBeVisible({ timeout: 5000 });
      await dialog.getByRole('spinbutton', { name: /Slot Number/i }).fill(String(slotNumber));
      await dialog.getByRole('button', { name: 'Save' }).click();
      
      // Wait for save to complete
      await expect(page.locator(`text=saved to slot ${slotNumber}`)).toBeVisible({ timeout: 5000 });
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
      await expect(page.locator('.slot-name:has-text("Slot 99")')).not.toBeVisible({ timeout: 5000 });
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

  test.describe('Delete All Slots', () => {
    test('should have Delete All button visible', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Delete all' })).toBeVisible();
    });
  });
});

test.describe('Leveling Page - Profile Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/leveling');
    await page.waitForSelector('text=Profile');
  });

  test('should open Profile Manager modal', async ({ page }) => {
    // Click the manage profiles button (gear icon)
    await page.getByRole('button', { name: /Manage Profiles/i }).click();

    // Wait for dialog to appear
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    
    // Modal should have some heading
    await expect(dialog.getByRole('heading')).toBeVisible();
  });

  test('should show list of profiles in manager', async ({ page }) => {
    await page.getByRole('button', { name: /Manage Profiles/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Should have at least Backup profile listed in the dialog
    await expect(dialog.locator('text=Backup')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Leveling Page - Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/leveling');
    await page.waitForSelector('text=Leveling Settings');
  });

  test('should display leveling settings', async ({ page }) => {
    await expect(page.locator('text=Grid Size')).toBeVisible();
    await expect(page.locator('text=Bed Temp')).toBeVisible();
    await expect(page.locator('text=Avg. Precision')).toBeVisible();
  });

  test('should have editable grid size', async ({ page }) => {
    const gridSizeInput = page.getByRole('spinbutton', { name: /Grid Size/i });
    await expect(gridSizeInput).toBeVisible();
    await expect(gridSizeInput).toBeEditable();
  });

  test('should have save button for settings', async ({ page }) => {
    // Settings form has save button in .button-group
    const settingsForm = page.locator('.settings-form');
    const saveButton = settingsForm.locator('button:has-text("Save")');
    await expect(saveButton).toBeVisible();
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
    await expect(page.locator('text=Confirm Grid Size Change')).toBeVisible({ timeout: 5000 });

    // Verify destructive operation warning is shown
    await expect(page.locator('text=All saved mesh profiles will be deleted')).toBeVisible();

    // Click the Confirm button (danger button)
    const confirmButton = page.locator('button:has-text("Confirm")');
    await confirmButton.click();

    // Wait for success message
    await expect(page.locator('text=/Settings saved|success/i')).toBeVisible({ timeout: 10000 });

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
    await expect(page.locator('text=/Settings updated|success/i')).toBeVisible({ timeout: 10000 });

    // Verify the bed temperature was actually updated
    await page.reload();
    await page.waitForSelector('.settings-form');
    const updatedBedTempInput = page.locator('.settings-form input[type="number"]').nth(1);
    await expect(updatedBedTempInput).toHaveValue('65');
  });
});

test.describe('Leveling Page - Bed Mesh Visualizer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/leveling');
    await page.waitForSelector('text=Bed Mesh Visualizer');
  });

  test('should display mesh data table', async ({ page }) => {
    await expect(page.locator('table')).toBeVisible();
  });

  test('should have Edit Mesh button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Edit Mesh' })).toBeVisible();
  });
});