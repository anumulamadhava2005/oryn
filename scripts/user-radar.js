#!/usr/bin/env node

/**
 * Oryn User Radar — Bird's Eye View CLI Tool.
 * Displays real-time device installations, active users, batches, and device models.
 *
 * Usage:
 *   node scripts/user-radar.js
 *   npm run radar
 */

const https = require('https');
const http = require('http');

const PRIMARY_URL = 'https://api.cruxel.xyz/oryn/telemetry/overview';
const FALLBACK_URL = 'http://localhost:3000/oryn/telemetry/overview';

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
  bgCyan: '\x1b[46m',
};

function fetchJson(urlStr) {
  return new Promise((resolve, reject) => {
    const isHttps = urlStr.startsWith('https:');
    const client = isHttps ? https : http;

    const req = client.get(urlStr, { timeout: 8000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
  });
}

function timeAgo(dateStr) {
  if (!dateStr) return 'Never';
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return 'Yesterday';
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function pad(str, len) {
  const s = String(str || '');
  return s.length >= len ? s.slice(0, len) : s + ' '.repeat(len - s.length);
}

async function main() {
  console.log(`\n${C.bold}${C.cyan}╔═══════════════════════════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║                     🛰️  ORYN USER RADAR — BIRD'S EYE VIEW                         ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚═══════════════════════════════════════════════════════════════════════════════════╝${C.reset}\n`);

  let data = null;
  try {
    data = await fetchJson(PRIMARY_URL);
  } catch {
    try {
      data = await fetchJson(FALLBACK_URL);
    } catch (err2) {
      console.error(`${C.yellow}⚠️ Could not reach telemetry server: ${err2.message}${C.reset}`);
      process.exit(1);
    }
  }

  const { summary, batches, departments, devices } = data;

  // 1. KPI Grid
  console.log(`${C.bold}📊 TELEMETRY SUMMARY:${C.reset}`);
  console.log(`   📱 ${C.bold}Total Installs:${C.reset}    ${C.cyan}${C.bold}${summary.totalInstalls}${C.reset} registered devices`);
  console.log(`   🔥 ${C.bold}Active Today:${C.reset}      ${C.yellow}${C.bold}${summary.activeToday}${C.reset} devices (last 24h)`);
  console.log(`   🟢 ${C.bold}Online Right Now:${C.reset}  ${C.green}${C.bold}${summary.activeNow}${C.reset} devices (< 15m)`);
  console.log(`   🎓 ${C.bold}Identified Users:${C.reset}  ${C.magenta}${C.bold}${summary.registeredUsers}${C.reset} campus students`);
  console.log(`   👤 ${C.bold}Guest / Anonymous:${C.reset} ${C.white}${summary.anonymousInstalls}${C.reset} devices`);
  console.log(`   🔔 ${C.bold}Push Ready:${C.reset}        ${C.green}${C.bold}${summary.withPushTokens || 0}${C.reset} devices with push tokens\n`);

  // 2. Batch Breakdown
  if (batches && Object.keys(batches).length > 0) {
    console.log(`${C.bold}🎓 BATCH DISTRIBUTION:${C.reset}`);
    const batchList = Object.entries(batches)
      .map(([batch, count]) => `${C.cyan}Batch of ${batch}:${C.reset} ${C.bold}${count}${C.reset}`)
      .join('  │  ');
    console.log(`   ${batchList}\n`);
  }

  // 3. Department Breakdown
  if (departments && Object.keys(departments).length > 0) {
    console.log(`${C.bold}🏛️  DEPARTMENTS:${C.reset}`);
    const deptList = Object.entries(departments)
      .map(([dept, count]) => `${C.yellow}${dept}:${C.reset} ${C.bold}${count}${C.reset}`)
      .join('  │  ');
    console.log(`   ${deptList}\n`);
  }

  // 4. Device Roster Table
  console.log(`${C.bold}📱 INSTALLED DEVICES & REGISTERED USERS (${devices.length}):${C.reset}`);
  console.log(`${C.dim}───────────────────────────────────────────────────────────────────────────────────────────────────────────${C.reset}`);
  console.log(
    `${C.bold}${pad('STATUS', 8)} ${pad('ROLL NO', 12)} ${pad('NAME', 26)} ${pad('BATCH', 8)} ${pad('PUSH', 6)} ${pad('DEVICE / OS', 26)} ${pad('LAST ACTIVE', 12)}${C.reset}`
  );
  console.log(`${C.dim}───────────────────────────────────────────────────────────────────────────────────────────────────────────${C.reset}`);

  for (const d of devices) {
    const statusIcon = d.is_online ? `${C.green}● LIVE${C.reset}` : d.is_active_today ? `${C.yellow}○ TODAY${C.reset}` : `${C.dim}○ OFFLINE${C.reset}`;
    const roll = d.roll_number || 'GUEST';
    const name = (d.user_name || 'Anonymous User').slice(0, 24);
    const batch = d.batch || '—';
    let pushIcon = `${C.dim}—${C.reset}`;
    if (d.expo_push_token) {
      pushIcon = `${C.green}🔔 YES${C.reset}`;
    } else if (d.push_diagnostic) {
      pushIcon = `${C.yellow}⚠️ ${d.push_diagnostic.slice(0, 8)}${C.reset}`;
    }
    const deviceStr = `${(d.device_model || 'Android').slice(0, 16)} (${d.os_name || 'OS'} ${d.os_version || ''})`.trim();
    const last = timeAgo(d.last_seen);

    console.log(
      `${pad(statusIcon, 17)} ${C.cyan}${pad(roll, 12)}${C.reset} ${C.bold}${pad(name, 26)}${C.reset} ${pad(batch, 8)} ${pad(pushIcon, 14)} ${C.white}${pad(deviceStr, 26)}${C.reset} ${pad(last, 12)}`
    );
  }

  console.log(`${C.dim}───────────────────────────────────────────────────────────────────────────────────────────────────${C.reset}`);
  console.log(`${C.dim}Tip: Run anytime with 'npm run radar' or view live in the app under Super Admin Hub / Settings.${C.reset}\n`);
}

main().catch(console.error);
