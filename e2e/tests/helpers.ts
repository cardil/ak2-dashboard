import { exec } from 'child_process';
import { promisify } from 'util';

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