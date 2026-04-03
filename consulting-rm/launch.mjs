#!/usr/bin/env node
/**
 * Consulting Resource Manager — launcher
 *
 * Starts Vite with --open so your default browser loads the app.
 * Uses Node to run Vite directly (avoids nested `npm` on Windows, which can
 * misbehave or confuse file associations).
 *
 * Mac or Linux (from this folder):
 *   npm run launch
 *   node launch.mjs
 *
 * Windows (Command Prompt or PowerShell, from this folder):
 *   npm run launch
 *   node launch.mjs
 *   Or double-click Start-App.cmd (do not double-click launch.mjs — Windows may
 *   open Visual Studio instead of running Node).
 */

import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const viteCli = join(root, 'node_modules', 'vite', 'bin', 'vite.js')

if (!existsSync(join(root, 'node_modules'))) {
  console.log('First run: installing dependencies…\n')
  const install = spawnSync('npm', ['install'], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  })
  if (install.status !== 0) process.exit(install.status ?? 1)
}

if (!existsSync(viteCli)) {
  console.error(
    'Vite is missing. From this folder run: npm install\nThen try again.'
  )
  process.exit(1)
}

const dev = spawn(process.execPath, [viteCli, '--open'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
})

dev.on('error', (err) => {
  console.error(err)
  process.exit(1)
})

dev.on('exit', (code) => process.exit(code ?? 0))
