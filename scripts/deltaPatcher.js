const crypto = require('crypto');

/**
 * Computes SHA-256 hex digest of a Buffer or string.
 */
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Creates an ultra-compact differential delta patch between base and target buffers.
 *
 * @param {Buffer} baseBuf - Base bundle buffer
 * @param {Buffer} targetBuf - Target bundle buffer
 * @param {string} [expectedBaseHash]
 * @param {string} [expectedTargetHash]
 * @param {object} [options]
 * @returns {object} patch object
 */
function createDeltaPatch(baseBuf, targetBuf, expectedBaseHash, expectedTargetHash, options = {}) {
  const minMatch = options.minMatch || 128;
  const step = options.step || 64;

  const baseHash = expectedBaseHash || sha256(baseBuf);
  const targetHash = expectedTargetHash || sha256(targetBuf);

  // If buffers are identical
  if (baseHash === targetHash) {
    return {
      format: 'oryn_delta_v1',
      baseHash,
      targetHash,
      baseSize: baseBuf.length,
      targetSize: targetBuf.length,
      ops: [],
    };
  }

  // 1. Find common byte prefix
  let prefix = 0;
  const minLen = Math.min(baseBuf.length, targetBuf.length);
  while (prefix < minLen && baseBuf[prefix] === targetBuf[prefix]) {
    prefix++;
  }

  // 2. Find common byte suffix
  let suffix = 0;
  while (suffix < (minLen - prefix) &&
         baseBuf[baseBuf.length - 1 - suffix] === targetBuf[targetBuf.length - 1 - suffix]) {
    suffix++;
  }

  const ops = [];

  // Helper to find largest common block in middle slice
  function findBlockMatch(bStart, bEnd, tStart, tEnd) {
    const bLen = bEnd - bStart;
    const tLen = tEnd - tStart;
    if (bLen < minMatch || tLen < minMatch) return null;

    // Index blocks in target slice
    const tIndex = new Map();
    for (let j = tStart; j <= tEnd - minMatch; j += step) {
      const key = targetBuf.readUInt32BE(j); // 4-byte fast hash filter
      if (!tIndex.has(key)) {
        tIndex.set(key, []);
      }
      tIndex.get(key).push(j);
    }

    let bestB = -1;
    let bestT = -1;
    let bestLen = 0;

    // Scan base slice
    for (let i = bStart; i <= bEnd - minMatch; i += step) {
      const key = baseBuf.readUInt32BE(i);
      const candidates = tIndex.get(key);
      if (!candidates) continue;

      for (const j of candidates) {
        // Verify full minMatch bytes
        if (baseBuf.compare(targetBuf, j, j + minMatch, i, i + minMatch) === 0) {
          // Extend match forward
          let k = minMatch;
          while (i + k < bEnd && j + k < tEnd && baseBuf[i + k] === targetBuf[j + k]) {
            k++;
          }
          if (k > bestLen) {
            bestLen = k;
            bestB = i;
            bestT = j;
          }
        }
      }
    }

    if (bestLen >= minMatch) {
      return { bStart: bestB, tStart: bestT, len: bestLen };
    }
    return null;
  }

  // Recursive diffing on sub-slices
  function diffRange(bStart, bEnd, tStart, tEnd) {
    if (bStart === bEnd && tStart === tEnd) return;

    const match = findBlockMatch(bStart, bEnd, tStart, tEnd);
    if (match) {
      diffRange(bStart, match.bStart, tStart, match.tStart);
      diffRange(match.bStart + match.len, bEnd, match.tStart + match.len, tEnd);
    } else {
      ops.push({
        offset: bStart,
        del: bEnd - bStart,
        ins: targetBuf.slice(tStart, tEnd).toString('utf8'),
      });
    }
  }

  const baseMidEnd = baseBuf.length - suffix;
  const targetMidEnd = targetBuf.length - suffix;
  diffRange(prefix, baseMidEnd, prefix, targetMidEnd);

  // Sort ops strictly ascending by offset
  ops.sort((a, b) => a.offset - b.offset);

  const patch = {
    format: 'oryn_delta_v1',
    baseHash,
    targetHash,
    baseSize: baseBuf.length,
    targetSize: targetBuf.length,
    ops,
  };

  // Immediate in-memory integrity validation
  const reconstructed = applyDeltaPatch(baseBuf, patch);
  const reconHash = sha256(reconstructed);
  if (reconHash !== targetHash) {
    throw new Error(`Delta patch verification failed! Expected ${targetHash}, got ${reconHash}`);
  }

  return patch;
}

/**
 * Applies a differential delta patch to a base buffer.
 *
 * @param {Buffer} baseBuf - Base bundle buffer
 * @param {object} patch - Delta patch object
 * @returns {Buffer} Reconstructed target bundle buffer
 */
function applyDeltaPatch(baseBuf, patch) {
  if (patch.format !== 'oryn_delta_v1') {
    throw new Error(`Unsupported patch format: ${patch.format}`);
  }

  const result = Buffer.allocUnsafe(patch.targetSize);
  let currBase = 0;
  let currRes = 0;

  const ops = [...patch.ops].sort((a, b) => a.offset - b.offset);

  for (const op of ops) {
    const copyLen = op.offset - currBase;
    if (copyLen > 0) {
      baseBuf.copy(result, currRes, currBase, currBase + copyLen);
      currBase += copyLen;
      currRes += copyLen;
    }

    const insBuf = Buffer.from(op.ins || '', 'utf8');
    if (insBuf.length > 0) {
      insBuf.copy(result, currRes, 0, insBuf.length);
      currRes += insBuf.length;
    }

    currBase += op.del;
  }

  // Copy trailing suffix
  const remLen = baseBuf.length - currBase;
  if (remLen > 0) {
    baseBuf.copy(result, currRes, currBase, currBase + remLen);
    currRes += remLen;
  }

  return result.slice(0, currRes);
}

module.exports = {
  sha256,
  createDeltaPatch,
  applyDeltaPatch,
};
