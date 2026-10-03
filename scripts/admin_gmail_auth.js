#!/usr/bin/env node

/**
 * Runner wrapper for Oryn Admin Gmail Auth CLI.
 * Forwards execution to mint_vps/scripts/admin_gmail_auth.js
 */

const path = require('path');
const { spawn } = require('child_process');

const targetScript = path.resolve(__dirname, '../../mint_vps/scripts/admin_gmail_auth.js');
const child = spawn(process.execPath, [targetScript, ...process.argv.slice(2)], {
  stdio: 'inherit',
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
