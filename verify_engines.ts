import { calculateITA, projectRSCA } from './src/lib/engines/rsca';
import { checkZeroGap, checkQuota } from './src/lib/engines/validation';
import { findVolumeMessage } from './src/lib/engines/strategy';

console.log("=== VERIFYING RSCA ENGINE ===");

// 1. ITA Calculation
const traits1 = { '33': 3.0, '34': 4.0, '35': 5.0 }; // Avg = 4.0
const ita1 = calculateITA(traits1);
console.log(`ITA Test 1 (Expected 4.00): ${ita1} [${ita1 === 4.0 ? 'PASS' : 'FAIL'}]`);

const traits2 = { '33': 3.0, '34': 3.0, '35': 4.0 }; // Avg = 3.333 -> 3.33
const ita2 = calculateITA(traits2);
console.log(`ITA Test 2 (Expected 3.33): ${ita2} [${ita2 === 3.33 ? 'PASS' : 'FAIL'}]`);

// 2. Projection
// Current = 3.80, Total = 10. New Reports = [4.0, 4.0]
// New Numerator = (3.8 * 10) + 8 = 46. Denom = 12. => 3.8333 -> 3.83
const proj = projectRSCA(3.80, 10, [4.0, 4.0]);
console.log(`Projection Test (Expected 3.83): ${proj} [${proj === 3.83 ? 'PASS' : 'FAIL'}]`);


console.log("\n=== VERIFYING VALIDATION ENGINE ===");

// 3. Zero Gap
// Correct: End 2025-01-01, Start 2025-01-02
const gapValid = checkZeroGap('2025-01-01', '2025-01-02');
console.log(`Gap Valid (Expected True): ${gapValid.isValid} [${gapValid.isValid ? 'PASS' : 'FAIL'}]`);

// Gap: End 2025-01-01, Start 2025-01-03
const gapInvalid = checkZeroGap('2025-01-01', '2025-01-03');
console.log(`Gap Invalid (Expected False): ${gapInvalid.isValid} [${!gapInvalid.isValid ? 'PASS' : 'FAIL'}] (${gapInvalid.message})`);

// 4. Quota
// Group Size 10. Max EP = 2. Max Combined = 6.
const quotaPass = checkQuota(10, 2, 4);
console.log(`Quota Pass (Expected True): ${quotaPass.isValid} [${quotaPass.isValid ? 'PASS' : 'FAIL'}]`);

const quotaFailEP = checkQuota(10, 3, 3); // 3 EP > 2
console.log(`Quota Fail EP (Expected False): ${quotaFailEP.isValid} [${!quotaFailEP.isValid ? 'PASS' : 'FAIL'}] (${quotaFailEP.message})`);


console.log("\n=== VERIFYING STRATEGY ENGINE ===");

// 5. Volume Opportunity
// Today is approx Dec 2025 in simulation context? Wait, we passed Date objects or strings.
// findVolumeMessage uses new Date() which is NOW (Real Time).
// Let's force a date for "Current".
// Last Report = 2025-01-01. Next Periodic = 2025-08-01.
// If "Current" is 2025-05-01 (4 months later).
// Days Since Last ~120 (>90). Days To Next ~90 (>60). Should Trigger.
const currentFake = new Date('2025-05-01');
const strategyMsg = findVolumeMessage('2025-01-01', '2025-08-01', currentFake);
console.log(`Strategy Trigger (Expected Value): ${strategyMsg !== null} [${strategyMsg !== null ? 'PASS' : 'FAIL'}]`);
console.log(`Message: ${strategyMsg}`);
