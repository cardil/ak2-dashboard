/**
 * E2E Test Configuration
 *
 * Centralized timeout configuration that can be controlled via environment variables.
 * This allows for faster local development and more conservative CI/CD settings.
 */

/**
 * Parse environment variable as number with fallback
 */
function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Maximum timeout for expect assertions (toBeVisible, etc.)
 * Default: 10000ms
 * Env: E2E_EXPECT_TIMEOUT
 */
export const EXPECT_TIMEOUT = getEnvNumber('E2E_EXPECT_TIMEOUT', 10000);

/**
 * Timeout for service operations (SSH restart, password change, etc.)
 * Default: 1000ms (reduced from 2000ms)
 * Env: E2E_SERVICE_TIMEOUT
 */
export const SERVICE_OPERATION_TIMEOUT = getEnvNumber('E2E_SERVICE_TIMEOUT', 1000);

/**
 * Timeout for UI state transitions (profile switching, navigation, etc.)
 * Default: 300ms (reduced from 500-1000ms)
 * Env: E2E_UI_TRANSITION_TIMEOUT
 */
export const UI_TRANSITION_TIMEOUT = getEnvNumber('E2E_UI_TRANSITION_TIMEOUT', 300);

/**
 * Timeout for initial page load and API data fetching
 * Default: 500ms (reduced from 1000-1500ms)
 * Env: E2E_PAGE_LOAD_TIMEOUT
 */
export const PAGE_LOAD_TIMEOUT = getEnvNumber('E2E_PAGE_LOAD_TIMEOUT', 500);

/**
 * Timeout for log refresh operations
 * Default: 500ms (reduced from 1000ms)
 * Env: E2E_LOG_REFRESH_TIMEOUT
 */
export const LOG_REFRESH_TIMEOUT = getEnvNumber('E2E_LOG_REFRESH_TIMEOUT', 500);
