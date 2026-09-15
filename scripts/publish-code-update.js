#!/usr/bin/env node

/**
 * 100% Custom Raw Code Update Publisher (Over-The-Air)
 * Compiles the React Native/Expo JavaScript bundle and broadcasts it to mint_vps.
 * Supports Differential Delta Patching (typically 200B - 15KB) for instantaneous uploads.
 *
 * Usage:
 *   node scripts/publish-code-update.js
 *   node scripts/publish-code-update.js --env prod
 *   node scripts/publish-code-update.js --env dev
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const readline = require('readline');
const { spawnSync } = require('child_process');
const { createDeltaPatch, sha256 } = require('./deltaPatcher');

const APP_JSON_PATH = path.join(__dirname, '../app.json');
const DIST_DIR = path.join(__dirname, '../dist');
const BUNDLE_PATH = path.join(DIST_DIR, 'oryn_code_bundle.js');
const PREV_BUNDLE_PATH = path.join(DIST_DIR, 'oryn_code_bundle_prev.js');
const PRIMARY_SERVER_URL = process.env.ORYN_API_URL || 'https://api.cruxel.xyz/oryn';
const LOCAL_FALLBACK_URL = 'http://localhost:3000/oryn';
const ADMIN_API_KEY = process.env.SDUI_ADMIN_KEY || 'oryn_sdui_secret_2026';

function askQuestion(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: process.stdin.isTTY,
    });
    rl.question(query, (ans) => {
      rl.close();
      resolve((ans || '').trim());
    });
  });
}

function compileBundle() {
  console.log('\n📦 Compiling raw JavaScript code bundle with Metro...');
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  const startTime = Date.now();
  const res = spawnSync(
    'npx',
    [
      'expo',
      'export:embed',
      '--entry-file',
      'node_modules/expo-router/entry',
      '--platform',
      'android',
      '--dev',
      'false',
      '--bundle-output',
      BUNDLE_PATH,
    ],
    {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' },
    }
  );

  if (res.status !== 0 || !fs.existsSync(BUNDLE_PATH)) {
    throw new Error('Metro raw bundle compilation failed');
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  const sizeMb = (fs.statSync(BUNDLE_PATH).size / (1024 * 1024)).toFixed(2);
  console.log(`✅ Bundle compiled in ${durationSec}s (${sizeMb} MB)`);
}

function httpGetJson(urlStr) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(urlStr);
      const isHttps = parsed.protocol === 'https:';
      const client = isHttps ? https : http;
      const req = client.request(parsed, { method: 'GET', timeout: 8000 }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: JSON.parse(body) });
          } catch {
            resolve({ ok: false, status: res.statusCode, data: body });
          }
        });
      });
      req.on('error', (err) => resolve({ ok: false, error: err.message }));
      req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'TIMEOUT' }); });
      req.end();
    } catch (e) {
      resolve({ ok: false, error: e.message });
    }
  });
}

function httpGetBuffer(urlStr) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(urlStr);
      const isHttps = parsed.protocol === 'https:';
      const client = isHttps ? https : http;
      const req = client.request(parsed, { method: 'GET', timeout: 15000 }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ ok: true, buffer: Buffer.concat(chunks) });
          } else {
            resolve({ ok: false, status: res.statusCode });
          }
        });
      });
      req.on('error', (err) => resolve({ ok: false, error: err.message }));
      req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'TIMEOUT' }); });
      req.end();
    } catch (e) {
      resolve({ ok: false, error: e.message });
    }
  });
}

function httpPostJson(urlStr, data) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(urlStr);
      const isHttps = parsed.protocol === 'https:';
      const client = isHttps ? https : http;

      const bodyStr = JSON.stringify(data);
      const req = client.request(
        parsed,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(bodyStr),
            'x-api-key': ADMIN_API_KEY,
            Authorization: `Bearer ${ADMIN_API_KEY}`,
          },
          timeout: 60000,
        },
        (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => {
            try {
              const json = JSON.parse(body);
              resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: json });
            } catch {
              resolve({ ok: false, status: res.statusCode, data: body });
            }
          });
        }
      );

      req.on('error', (err) => resolve({ ok: false, error: err.message }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, error: 'TIMEOUT' });
      });

      req.write(bodyStr);
      req.end();
    } catch (e) {
      resolve({ ok: false, error: e.message });
    }
  });
}

async function uploadBundleInChunks(serverUrl, fingerprint, environment, bundleBuffer, hash) {
  const CHUNK_SIZE = 512 * 1024; // 512 KB per chunk to stay well under proxy limits
  const totalChunks = Math.ceil(bundleBuffer.length / CHUNK_SIZE);
  const uploadId = 'up_' + crypto.randomBytes(8).toString('hex');

  console.log(`   Uploading full bundle in ${totalChunks} chunk(s) to ${serverUrl}...`);

  let lastResponse = null;
  for (let i = 0; i < totalChunks; i++) {
    const chunkSlice = bundleBuffer.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    const payload = {
      uploadId,
      chunkIndex: i,
      totalChunks,
      chunkBase64: chunkSlice.toString('base64'),
      fingerprint,
      environment,
      description: `Raw code live update [${hash.slice(0, 8)}]`,
    };

    const res = await httpPostJson(`${serverUrl}/code-updates/publish-chunk`, payload);
    if (!res.ok) {
      return { ok: false, error: `Chunk ${i + 1}/${totalChunks} failed: ${res.error || res.status} (${JSON.stringify(res.data || {})})` };
    }
    process.stdout.write(`   ↳ Chunk ${i + 1}/${totalChunks} uploaded (${(chunkSlice.length / 1024).toFixed(0)} KB)\n`);
    lastResponse = res;
  }

  return { ok: true, data: lastResponse.data };
}

async function publishUpdate(serverUrl, fingerprint, environment, targetBuffer, targetHash) {
  // 1. Check current active version on server
  console.log(`\n🔍 Checking active version on ${serverUrl}...`);
  const checkRes = await httpGetJson(`${serverUrl}/code-updates/check?fingerprint=${encodeURIComponent(fingerprint)}`);

  const forceFull = process.argv.includes('--full');
  if (checkRes.ok && checkRes.data && checkRes.data.hash) {
    const activeHash = checkRes.data.hash;
    if (activeHash === targetHash) {
      console.log(`ℹ️ Bundle [${targetHash.slice(0, 8)}] is ALREADY ACTIVE on ${serverUrl}! No changes to broadcast.`);
      return { ok: true, data: { ...checkRes.data, unchanged: true } };
    }

    console.log(`   Server is currently at: [${activeHash.slice(0, 8)}]`);
    console.log(`   New bundle to broadcast: [${targetHash.slice(0, 8)}]`);

    // Attempt Differential Delta Patch unless --full is requested
    if (!forceFull) try {
      let baseBuffer = null;
      if (fs.existsSync(PREV_BUNDLE_PATH)) {
        const prevBuf = fs.readFileSync(PREV_BUNDLE_PATH);
        if (sha256(prevBuf) === activeHash) {
          baseBuffer = prevBuf;
          console.log(`   Loaded cached base bundle from dist/oryn_code_bundle_prev.js`);
        }
      }

      if (!baseBuffer) {
        process.stdout.write(`   Fetching base bundle from server for delta diff... `);
        const downloadRes = await httpGetBuffer(`${serverUrl}/code-updates/bundle/${activeHash}`);
        if (downloadRes.ok && sha256(downloadRes.buffer) === activeHash) {
          baseBuffer = downloadRes.buffer;
          fs.writeFileSync(PREV_BUNDLE_PATH, baseBuffer);
          console.log('done.');
        } else {
          console.log('failed (falling back to full bundle upload).');
        }
      }

      if (baseBuffer) {
        const startTime = Date.now();
        const patch = createDeltaPatch(baseBuffer, targetBuffer, activeHash, targetHash);
        const patchJson = JSON.stringify(patch);
        const patchSizeKb = (patchJson.length / 1024).toFixed(1);
        const elapsedMs = Date.now() - startTime;

        console.log(`⚡ Differential Delta Patch generated in ${elapsedMs}ms!`);
        console.log(`   Payload Size: ${patchSizeKb} KB (${patch.ops.length} diff ops) vs full ${(targetBuffer.length / (1024 * 1024)).toFixed(2)} MB`);

        if (patchJson.length < 5 * 1024 * 1024) {
          process.stdout.write(`   Transmitting differential patch... `);
          const patchUploadRes = await httpPostJson(`${serverUrl}/code-updates/publish-patch`, {
            fingerprint,
            environment,
            baseHash: activeHash,
            targetHash,
            patch,
            description: `Delta patch [${activeHash.slice(0, 8)} -> ${targetHash.slice(0, 8)}]`,
          });

          if (patchUploadRes.ok) {
            console.log('SUCCESS! (Instant sub-50ms single request)');
            fs.writeFileSync(PREV_BUNDLE_PATH, targetBuffer);
            return { ok: true, data: patchUploadRes.data, isPatch: true, patchSizeKb };
          } else {
            console.log(`Patch upload failed: ${patchUploadRes.error || patchUploadRes.status}. Falling back to full bundle...`);
          }
        }
      }
    } catch (deltaErr) {
      console.warn('⚠️ Delta computation failed:', deltaErr.message, '- proceeding with full bundle upload');
    }
  }

  // Fallback: Full chunked bundle upload
  console.log('📦 Uploading full raw bundle...');
  const res = await uploadBundleInChunks(serverUrl, fingerprint, environment, targetBuffer, targetHash);
  if (res.ok) {
    fs.writeFileSync(PREV_BUNDLE_PATH, targetBuffer);
  }
  return res;
}

async function main() {
  if (!fs.existsSync(APP_JSON_PATH)) {
    console.error('Error: app.json not found');
    process.exit(1);
  }

  const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
  const extra = appJson.expo?.extra || {};
  const devFingerprint = extra.devFingerprint || 'dev-oryn-fingerprint';
  const prodFingerprint = extra.prodFingerprint || 'prod-oryn-fingerprint';
  const projectId = extra.projectId || 'oryn';

  console.log('─'.repeat(64));
  console.log('⚡ ORYN RAW CODE LIVE UPDATE TRANSMITTER');
  console.log(`   Project ID:       ${projectId}`);
  console.log(`   Dev Fingerprint:  ${devFingerprint}`);
  console.log(`   Prod Fingerprint: ${prodFingerprint}`);
  console.log('─'.repeat(64));

  let targetEnvs = [];
  const args = process.argv.slice(2);
  const isAll = args.includes('--all');
  const envArgIdx = args.indexOf('--env');

  if (isAll) {
    targetEnvs = ['prod', 'dev'];
  } else if (envArgIdx !== -1 && args[envArgIdx + 1]) {
    const envVal = args[envArgIdx + 1].toLowerCase();
    targetEnvs = envVal === 'all' || envVal === 'both' ? ['prod', 'dev'] : [envVal];
  }

  if (targetEnvs.length === 0) {
    console.log('Where should this raw code update be broadcasted?');
    console.log(' [1] Both Production & Development (Recommended - all users & testers)');
    console.log(` [2] Production only  (Apps running Prod fingerprint: ${prodFingerprint})`);
    console.log(` [3] Development only (Apps running Dev fingerprint: ${devFingerprint})`);
    console.log(' [4] Cancel');

    const answer = await askQuestion('\nEnter selection [1-4] (default: 1): ');
    if (answer === '2' || answer === 'prod') {
      targetEnvs = ['prod'];
    } else if (answer === '3' || answer === 'dev') {
      targetEnvs = ['dev'];
    } else if (answer === '4' || answer === 'cancel') {
      console.log('Operation cancelled.');
      process.exit(0);
    } else {
      targetEnvs = ['prod', 'dev'];
    }
  }

  // 1. Compile bundle
  compileBundle();

  // 2. Read and hash bundle
  const bundleBuffer = fs.readFileSync(BUNDLE_PATH);
  const hash = sha256(bundleBuffer);

  for (const targetEnv of targetEnvs) {
    const targetFingerprint = targetEnv === 'prod' ? prodFingerprint : devFingerprint;
    console.log(`\n📡 Transmitting raw code to ${targetEnv.toUpperCase()} apps...`);
    console.log(`   Target Fingerprint: ${targetFingerprint}`);
    console.log(`   Bundle Hash:       ${hash}`);

    // 3. Upload to VPS (with fallback)
    let result = await publishUpdate(PRIMARY_SERVER_URL, targetFingerprint, targetEnv, bundleBuffer, hash);
    let usedServer = PRIMARY_SERVER_URL;

    if (!result.ok && !result.data?.unchanged) {
      console.log(`⚠️ Primary server unreachable (${result.error || result.status}), trying fallback...`);
      result = await publishUpdate(LOCAL_FALLBACK_URL, targetFingerprint, targetEnv, bundleBuffer, hash);
      usedServer = LOCAL_FALLBACK_URL;
    }

    if (result.ok) {
      console.log('\n' + '─'.repeat(64));
      console.log(`✅ RAW CODE UPDATE PUBLISHED TO ${targetEnv.toUpperCase()}!`);
      console.log(`   Server:            ${usedServer}`);
      console.log(`   Bundle Version:    v${result.data?.version || 1}`);
      console.log(`   Bundle Hash:       ${hash}`);
      if (result.isPatch) {
        console.log(`   Delivery Method:   ⚡ Instant Differential Delta Patch (${result.patchSizeKb} KB)`);
      } else if (result.data?.unchanged) {
        console.log(`   Delivery Method:   No change needed (already active)`);
      } else {
        console.log(`   Delivery Method:   Full Bundle (${(bundleBuffer.length / (1024 * 1024)).toFixed(2)} MB)`);
      }
      console.log(`   Target Apps:       All installed apps with fingerprint '${targetFingerprint}'`);
      console.log('                      will automatically download and run this code on launch/foreground!');
      console.log('─'.repeat(64) + '\n');
    } else {
      console.error(`❌ Failed to publish bundle for ${targetEnv}:`, result.error || result.data);
    }
  }
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
