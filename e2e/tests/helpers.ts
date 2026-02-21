import { exec } from 'child_process';
import { promisify } from 'util';
import type { APIRequestContext } from '@playwright/test';

const execAsync = promisify(exec);

/**
 * Generate a new bed mesh in the testbed.
 * Requires E2E_GEN_MESH_CMD environment variable to be set.
 * @throws Error if E2E_GEN_MESH_CMD is not set
 */
export async function generateBedMesh(): Promise<void> {
  const cmd = process.env.E2E_GEN_MESH_CMD;

  if (!cmd) {
    throw new Error('E2E_GEN_MESH_CMD environment variable is required but not set');
  }

  try {
    const { stdout, stderr } = await execAsync(cmd);
    if (stdout) console.log('[gen-mesh]', stdout);
    if (stderr) console.error('[gen-mesh stderr]', stderr);
  } catch (error: any) {
    console.error('[gen-mesh error]', error.message);
    throw new Error(`Failed to generate bed mesh: ${error.message}`);
  }
}

/**
 * Wait for a condition to be true, with timeout
 */
export async function waitFor(
  condition: () => Promise<boolean>,
  timeoutMs: number = 5000,
  intervalMs: number = 100
): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  throw new Error(`waitFor timed out after ${timeoutMs}ms`);
}

/**
 * Fetch the last N bytes of the printer log file.
 * Uses HTTP Range header to efficiently fetch only the tail of the log.
 * @param request - Playwright APIRequestContext from page.request
 * @param bytes - Number of bytes to fetch from the end (default: 2048)
 * @returns The last portion of the log file as a string
 */
export async function fetchLogTail(request: APIRequestContext, bytes: number = 2048): Promise<string> {
  // First get file size with HEAD request
  const headResponse = await request.head('/files/log');
  
  if (!headResponse.ok()) {
    throw new Error(`Failed to get log file size: ${headResponse.status()} ${headResponse.statusText()}`);
  }
  
  const contentLength = headResponse.headers()['content-length'];
  const fileSize = contentLength ? parseInt(contentLength, 10) : 0;
  
  // If file is smaller than requested bytes, fetch the whole file
  if (fileSize <= bytes) {
    const response = await request.get('/files/log');
    if (!response.ok()) {
      throw new Error(`Failed to fetch log: ${response.status()} ${response.statusText()}`);
    }
    return await response.text();
  }
  
  // Otherwise fetch only the last N bytes using Range header
  const rangeStart = fileSize - bytes;
  const response = await request.get('/files/log', {
    headers: {
      'Range': `bytes=${rangeStart}-`
    }
  });
  
  if (!response.ok() && response.status() !== 206) {
    throw new Error(`Failed to fetch log: ${response.status()} ${response.statusText()}`);
  }
  
  return await response.text();
}