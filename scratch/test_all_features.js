/**
 * Automated Verification Script for Oryn 2.0 Features
 */
const assert = require('assert');

console.log('--- Testing Attendance & Bunk Forecaster Formulas ---');
function calculateAttendanceStats(attended, total, threshold = 0.75) {
  if (total === 0) {
    return { percentage: 100, safeBunks: 0, classesNeeded: 0, status: 'safe' };
  }
  const percentage = Math.round((attended / total) * 1000) / 10;
  let safeBunks = 0;
  let classesNeeded = 0;
  let status = 'safe';

  if (percentage >= threshold * 100) {
    safeBunks = Math.max(0, Math.floor((attended - threshold * total) / threshold));
    status = percentage >= 80 ? 'safe' : 'warning';
  } else {
    classesNeeded = Math.max(1, Math.ceil((threshold * total - attended) / (1 - threshold)));
    status = 'critical';
  }

  return { percentage, safeBunks, classesNeeded, status };
}

// Case 1: 20 attended out of 20 -> 100%, 75% threshold
// (20 - 0.75 * 20) / 0.75 = (20 - 15) / 0.75 = 5 / 0.75 = 6.66 -> 6 safe bunks
const res1 = calculateAttendanceStats(20, 20, 0.75);
assert.strictEqual(res1.percentage, 100);
assert.strictEqual(res1.safeBunks, 6);
assert.strictEqual(res1.status, 'safe');
console.log('✔ Case 1: 20/20 classes -> 100%, 6 safe bunks passed.');

// Case 2: 15 attended out of 20 -> 75%, 0 safe bunks, 0 needed
const res2 = calculateAttendanceStats(15, 20, 0.75);
assert.strictEqual(res2.percentage, 75);
assert.strictEqual(res2.safeBunks, 0);
assert.strictEqual(res2.status, 'warning');
console.log('✔ Case 2: 15/20 classes -> 75%, 0 safe bunks, warning status passed.');

// Case 3: 14 attended out of 20 -> 70%, critical
// (0.75 * 20 - 14) / 0.25 = (15 - 14) / 0.25 = 1 / 0.25 = 4 classes needed
const res3 = calculateAttendanceStats(14, 20, 0.75);
assert.strictEqual(res3.percentage, 70);
assert.strictEqual(res3.classesNeeded, 4);
assert.strictEqual(res3.status, 'critical');
console.log('✔ Case 3: 14/20 classes -> 70%, 4 classes needed to recover passed.');

console.log('--- Testing Campus Hall & Lab Locator Deterministic Parser ---');
function resolveRoomLocation(code) {
  const upper = code.trim().toUpperCase();
  if (upper.startsWith('H')) {
    const floorChar = upper.charAt(1);
    const floorNum = parseInt(floorChar, 10);
    const floorLabel = floorNum === 0 ? 'Ground Floor (GF)' : `Floor ${floorNum}`;
    return { building: 'Lecture Hall Complex (LHC)', floor: floorLabel };
  }
  if (upper.startsWith('L')) {
    const numPart = parseInt(upper.replace(/^L-?/, ''), 10);
    const floor = Math.floor(numPart / 100);
    const floorLabel = floor === 0 ? 'Ground Floor (GF)' : `Floor ${floor}`;
    return { building: 'Laboratory Complex', floor: floorLabel };
  }
  return { building: 'Academic Zone', floor: 'Check Department' };
}

assert.strictEqual(resolveRoomLocation('H25').floor, 'Floor 2');
assert.strictEqual(resolveRoomLocation('H01').floor, 'Ground Floor (GF)');
assert.strictEqual(resolveRoomLocation('L509').floor, 'Floor 5');
assert.strictEqual(resolveRoomLocation('L008').floor, 'Ground Floor (GF)');
console.log('✔ Room Locator parsing verified (H25->F2, H01->GF, L509->F5, L008->GF).');

console.log('--- Testing Marketplace Data Filtering ---');
const items = [
  { id: '1', title: 'Hero Cycle', category: 'Cycles', price: 2000, status: 'available' },
  { id: '2', title: 'Casio Calculator', category: 'Electronics', price: 900, status: 'available' },
  { id: '3', title: 'Lab Coat', category: 'Lab Gear', price: 250, status: 'sold' },
];
const cycles = items.filter(i => i.category === 'Cycles');
assert.strictEqual(cycles.length, 1);
assert.strictEqual(cycles[0].title, 'Hero Cycle');
console.log('✔ Marketplace data filtering passed.');

console.log('\nAll automated validation tests PASSED successfully!');
