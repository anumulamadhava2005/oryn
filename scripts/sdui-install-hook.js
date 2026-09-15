#!/usr/bin/env node

/**
 * Ensures that `node_modules/expo/bin/cli` intercepts `expo start` and `npx expo start`
 * to prompt the user and synchronize project registration and fingerprints with mint_vps.
 */

const fs = require('fs');
const path = require('path');

const expoCliBinPath = path.join(__dirname, '../node_modules/expo/bin/cli');

if (!fs.existsSync(expoCliBinPath)) {
  process.exit(0);
}

let content = fs.readFileSync(expoCliBinPath, 'utf8');

if (content.includes('SDUI_HOOK_EXECUTED')) {
  // Already installed
  process.exit(0);
}

const hookCode = `
// SDUI Pre-start Hook for 'npx expo start' / 'expo start'
const _args = process.argv.slice(2);
const _isStart = _args.length === 0 || _args[0] === 'start' || _args.includes('start');

if (_isStart && !process.env.SDUI_HOOK_EXECUTED) {
  process.env.SDUI_HOOK_EXECUTED = '1';
  try {
    const { spawnSync } = require('child_process');
    const _path = require('path');
    const _prestart = _path.resolve(__dirname, '../../../scripts/sdui-prestart.js');
    if (require('fs').existsSync(_prestart)) {
      spawnSync(process.execPath, [_prestart], { stdio: 'inherit', env: process.env });
    }
  } catch (e) {
    // Non-blocking
  }
}
`;

// Insert hook right after '#!/usr/bin/env node'
if (content.startsWith('#!/usr/bin/env node')) {
  content = content.replace('#!/usr/bin/env node', '#!/usr/bin/env node\n' + hookCode);
} else {
  content = hookCode + '\n' + content;
}

fs.writeFileSync(expoCliBinPath, content, 'utf8');
try {
  fs.chmodSync(expoCliBinPath, '755');
} catch {}
console.log('[SDUI] Expo CLI hook installed successfully.');
