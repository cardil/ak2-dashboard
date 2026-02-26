/**
 * Memory Leak Detection Script
 *
 * Detects memory leaks by hammering all major GET API paths.
 * Critical because the printer has only ~109MB RAM.
 *
 * Uses `docker/podman exec` to read the webfsd process RSS directly from
 * /proc/<pid>/statm — insulated from OS page cache noise that makes
 * system-wide free_mem measurements unreliable.
 *
 * A warmup burst primes page caches before the baseline is taken so that
 * the before/after measurements are on equal footing.
 *
 * Run with: npx tsx tests/perf.ts
 * Env vars:
 *   E2E_BASE_URL      - Base URL of the webserver (default: http://localhost:20080)
 *   E2E_CONTAINER     - Container name (default: ak2-testbed)
 *   PERF_ITERS        - Number of burst iterations per path (default: 500)
 *   PERF_MAX_GROW_KB  - Max allowed RSS increase in KB (default: 15)
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:20080';
const CONTAINER = process.env.E2E_CONTAINER ?? 'ak2-testbed';
const ITERS = parseInt(process.env.PERF_ITERS ?? '500', 10);
const MAX_GROW_KB = parseInt(process.env.PERF_MAX_GROW_KB ?? '15', 10);

const PATHS = [
  '/api/system',
  '/api/profiles',
  '/api/profiles/current',
  '/api/profiles/1',
  '/api/webserver',
  '/',
];

/** Detect whether podman or docker is available. */
async function detectDocker(): Promise<string> {
  for (const cmd of ['podman', 'docker']) {
    try {
      await execAsync(`command -v ${cmd}`);
      return cmd;
    } catch {
      // not found, try next
    }
  }
  throw new Error('Neither podman nor docker found in PATH');
}

/**
 * Read the webfsd process RSS in bytes from inside the container.
 * Uses pgrep to find the PID via "/opt/bin/webfsd " pattern (trailing space
 * avoids matching webfsd-runner), then reads /proc/<pid>/statm field 2 (RSS pages).
 */
async function getProcessRss(docker: string): Promise<number> {
  // Get PID of webfsd (pattern from e2e/scripts/poweroff)
  const { stdout: pidOut } = await execAsync(
    `${docker} exec ${CONTAINER} sh -c 'pgrep -f "/opt/bin/webfsd " | head -1'`
  );
  const pid = pidOut.trim();
  if (!pid) throw new Error('webfsd process not found in container');

  // Read statm: fields are (pages): vsize rss shared text lib data dirty
  const { stdout: statmOut } = await execAsync(
    `${docker} exec ${CONTAINER} sh -c 'cat /proc/${pid}/statm'`
  );
  const fields = statmOut.trim().split(/\s+/);
  const rssPages = parseInt(fields[1], 10);
  if (isNaN(rssPages)) throw new Error(`Unexpected /proc/${pid}/statm output: ${statmOut.trim()}`);

  // Page size (ARM typically 4096, but ask the container)
  const { stdout: psOut } = await execAsync(
    `${docker} exec ${CONTAINER} sh -c 'getconf PAGESIZE 2>/dev/null || echo 4096'`
  );
  const pageSize = parseInt(psOut.trim(), 10) || 4096;
  return rssPages * pageSize;
}

async function burst(path: string, iters: number): Promise<void> {
  const url = `${BASE_URL}${path}`;
  for (let i = 0; i < iters; i++) {
    const res = await fetch(url);
    await res.arrayBuffer(); // consume body to release connection
  }
}

async function main(): Promise<void> {
  const docker = await detectDocker();
  console.log(`Memory leak detection (process RSS via ${docker} exec)`);
  console.log(`  Base URL  : ${BASE_URL}`);
  console.log(`  Container : ${CONTAINER}`);
  console.log(`  Paths     : ${PATHS.length}`);
  console.log(`  Iters     : ${ITERS} per path`);
  console.log(`  Max grow  : ${MAX_GROW_KB} KB`);
  console.log('');

  // Warmup — prime page caches so baseline is taken in a hot state
  console.log('Warmup burst (priming caches)...');
  for (const path of PATHS) {
    await burst(path, 20);
  }
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log('Warmup done.');
  console.log('');

  // Baseline RSS
  const baselineRss = await getProcessRss(docker);
  console.log(`Baseline webfsd RSS: ${(baselineRss / 1024).toFixed(1)} KB`);
  console.log('');

  // Burst all paths
  for (const path of PATHS) {
    process.stdout.write(`  Bursting ${path.padEnd(30)} (${ITERS} reqs) ... `);
    const t0 = Date.now();
    await burst(path, ITERS);
    const elapsed = Date.now() - t0;
    console.log(`done in ${elapsed}ms`);
  }

  console.log('');
  console.log('Waiting 1s for allocator to settle...');
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Final RSS
  const finalRss = await getProcessRss(docker);
  console.log(`Final webfsd RSS   : ${(finalRss / 1024).toFixed(1)} KB`);

  const growBytes = finalRss - baselineRss;
  const growKB = growBytes / 1024;
  console.log('');
  console.log(`RSS change         : ${growKB >= 0 ? '+' : ''}${growKB.toFixed(1)} KB`);

  if (growKB > MAX_GROW_KB) {
    console.error('');
    console.error(`FAIL: RSS grew by ${growKB.toFixed(1)} KB which exceeds threshold of ${MAX_GROW_KB} KB`);
    console.error('Possible memory leak detected!');
    process.exit(1);
  }

  console.log(`PASS: RSS growth (${growKB.toFixed(1)} KB) is within threshold (${MAX_GROW_KB} KB)`);
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
