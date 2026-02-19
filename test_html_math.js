// Test the JavaScript math from index.html against the same anchor values as test_core.py

// ===== Extracted math functions (same as index.html) =====

function validateFraction(name, v) {
  if (!(v >= 0.0 && v <= 1.0)) throw new Error(name + " must be in [0, 1].");
}

function occupancyMetrics(lambda) {
  if (lambda < 0) throw new Error("lambda must be >= 0.");
  const pEmpty = Math.exp(-lambda);
  const pSingle = lambda * pEmpty;
  const pMulti = 1.0 - pEmpty - pSingle;
  const occupied = 1.0 - pEmpty;
  const purity = occupied > 0 ? pSingle / occupied : 0;
  return { lambda, pEmpty, pSingle, pMulti, purity };
}

function lambdaFromEmptyFraction(fEmpty) {
  if (fEmpty <= 0 || fEmpty >= 1) throw new Error("f_empty must be strictly between 0 and 1.");
  return -Math.log(fEmpty);
}

function normInvCDF(p) {
  if (p <= 0 || p >= 1) throw new Error("p must be in (0,1)");
  if (p < 0.5) return -normInvCDF(1 - p);
  const t = Math.sqrt(-2 * Math.log(1 - p));
  const c0 = 2.515517, c1 = 0.802853, c2 = 0.010328;
  const d1 = 1.432788, d2 = 0.189269, d3 = 0.001308;
  return t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t);
}

function wilsonInterval(kSuccess, nTotal, confidence) {
  if (nTotal <= 0) throw new Error("n_total must be > 0.");
  if (kSuccess < 0 || kSuccess > nTotal) throw new Error("k_success must be in [0, n_total].");
  if (confidence <= 0 || confidence >= 1) throw new Error("confidence must be in (0, 1).");
  const pHat = kSuccess / nTotal;
  const z = normInvCDF(0.5 + confidence / 2.0);
  const z2 = z * z;
  const denom = 1.0 + z2 / nTotal;
  const center = (pHat + z2 / (2.0 * nTotal)) / denom;
  const half = z * Math.sqrt((pHat * (1 - pHat) / nTotal) + (z2 / (4.0 * nTotal * nTotal))) / denom;
  return { lower: Math.max(0, center - half), upper: Math.min(1, center + half), confidence };
}

function lambdaCIFromEmptyCounts(nEmpty, nTotal, confidence) {
  const interval = wilsonInterval(nEmpty, nTotal, confidence);
  const eps = 1e-12;
  const fLo = Math.max(interval.lower, eps);
  const fHi = Math.min(interval.upper, 1.0 - eps);
  return { lower: -Math.log(fHi), upper: -Math.log(fLo), confidence };
}

function expectedSingleEvents(nDroplets, lambda, qQC, qID) {
  if (nDroplets < 0) throw new Error("n_droplets must be >= 0.");
  validateFraction("q_qc", qQC);
  validateFraction("q_identity", qID);
  const pSingle = occupancyMetrics(lambda).pSingle;
  return nDroplets * pSingle * qQC * qID;
}

function requiredDroplets(targetEvents, lambda, qQC, qID) {
  if (targetEvents <= 0) throw new Error("target must be > 0.");
  validateFraction("q_qc", qQC);
  validateFraction("q_identity", qID);
  const effective = occupancyMetrics(lambda).pSingle * qQC * qID;
  if (effective <= 0) throw new Error("Effective rate must be > 0.");
  return targetEvents / effective;
}

function comparePoints(la, lb) {
  const ma = occupancyMetrics(la);
  const mb = occupancyMetrics(lb);
  return {
    yieldRatio: mb.pSingle / ma.pSingle,
    burdenRatio: mb.pMulti / ma.pMulti,
  };
}

// ===== Test harness =====

let passed = 0;
let failed = 0;

function assertAlmostEqual(actual, expected, places, label) {
  const tol = Math.pow(10, -places);
  if (Math.abs(actual - expected) < tol) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${label}: expected ${expected}, got ${actual} (tol=${tol})`);
  }
}

function assertThrows(fn, label) {
  try {
    fn();
    failed++;
    console.error(`  FAIL: ${label}: expected error but none thrown`);
  } catch (e) {
    passed++;
  }
}

// ===== Tests (mirroring test_core.py) =====

console.log("test_anchor_lambda_010");
{
  const m = occupancyMetrics(0.10);
  assertAlmostEqual(m.pEmpty,  0.9048374180, 8, "p_empty");
  assertAlmostEqual(m.pSingle, 0.0904837418, 8, "p_single");
  assertAlmostEqual(m.pMulti,  0.0046788401, 8, "p_multi_ge_2");
  assertAlmostEqual(m.purity,  0.9508331945, 8, "purity");
}

console.log("test_anchor_lambda_020");
{
  const m = occupancyMetrics(0.20);
  assertAlmostEqual(m.pEmpty,  0.8187307531, 8, "p_empty");
  assertAlmostEqual(m.pSingle, 0.1637461506, 8, "p_single");
  assertAlmostEqual(m.pMulti,  0.0175230963, 8, "p_multi_ge_2");
  assertAlmostEqual(m.purity,  0.9033311132, 8, "purity");
}

console.log("test_compare_ratios");
{
  const c = comparePoints(0.10, 0.20);
  assertAlmostEqual(c.yieldRatio,  1.8096748361, 9, "yield_ratio");
  assertAlmostEqual(c.burdenRatio, 3.7451795115, 9, "burden_ratio");
}

console.log("test_required_droplets_planning");
{
  const n = requiredDroplets(10000, 0.10, 0.60, 0.70);
  assertAlmostEqual(n, 263135.9329, 3, "required_droplets");
}

console.log("test_lambda_from_empty");
{
  const f = Math.exp(-0.10);
  assertAlmostEqual(lambdaFromEmptyFraction(f), 0.10, 10, "lambda_from_empty");
}

console.log("test_lambda_ci");
{
  const ci = lambdaCIFromEmptyCounts(9048, 10000, 0.95);
  if (ci.lower < 0.10 && 0.10 < ci.upper && ci.lower >= 0) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: lambda CI: lower=${ci.lower}, upper=${ci.upper}, expected 0.10 inside`);
  }
}

console.log("test_invalid_inputs");
{
  assertThrows(() => occupancyMetrics(-0.1), "negative lambda");
  assertThrows(() => lambdaFromEmptyFraction(1.0), "f_empty=1.0");
  assertThrows(() => requiredDroplets(1000, 0.1, 1.2, 0.9), "q_qc=1.2");
}

// Note: requiredDroplets doesn't validate fractions itself (the Python version does),
// so test what our JS actually does. Let's also test the edge case directly.

// ===== Summary =====

console.log("---");
if (failed === 0) {
  console.log(`ALL PASSED: ${passed} assertions`);
  process.exit(0);
} else {
  console.log(`FAILED: ${failed} of ${passed + failed} assertions`);
  process.exit(1);
}
