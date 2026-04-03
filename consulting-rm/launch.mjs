#!/usr/bin/env node
/**
 * Consulting Resource Manager — launcher
 *
 * Runs `npm run dev` (Vite with --open): your default browser opens to the app.
 * First run installs dependencies if node_modules is missing.
 *
 * Mac or Linux (from this folder):
 *   npm run launch
 *   node launch.mjs
 *
 * Windows (Command Prompt or PowerShell, from this folder):
 *   npm run launch
 *   node launch.mjs
 */

import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))

if (!existsSync(join(root, 'node_modules'))) {
  console.log('First run: installing dependencies…\n')
  const install = spawnSync('npm', ['install'], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  })
  if (install.status !== 0) process.exit(install.status ?? 1)
}

const dev = spawn('npm', ['run', 'dev'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
})

dev.on('error', (err) => {
  console.error(err)
  process.exit(1)
})

dev.on('exit', (code) => process.exit(code ?? 0))
