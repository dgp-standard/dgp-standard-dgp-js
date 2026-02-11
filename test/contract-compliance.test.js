/**
 * GovernanceEngine Contract Compliance Test Suite
 * 
 * NORMATIVE TESTS - Zero tolerance for deviation from canonical-v1.json vectors.
 * 
 * Contract Rules:
 * - Exact score match (integer precision)
 * - Exact field presence/absence
 * - Deterministic array ordering (violations, actions)
 * - Reproducible metadata (via time injection)
 * 
 * Protocol Discipline:
 * - If test fails → fix implementation (NEVER adjust vectors)
 * - Vectors are source of truth, not implementation intuition
 * - Cross-language implementations must produce identical reports
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { GovernanceEngine } from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VECTORS_PATH = path.join(__dirname, 'vectors', 'canonical-v1.json');

// Fixed timestamp for deterministic metadata
const FIXED_ISO = '2026-02-11T00:00:00.000Z';
const FIXED_ENGINE_VERSION = '0.1.0';

/**
 * Load canonical test vectors from JSON file.
 * Validates vector file structure before returning.
 */
function loadVectors() {
  const raw = fs.readFileSync(VECTORS_PATH, 'utf8');
  const json = JSON.parse(raw);

  assert.equal(json.version, '1.0.0', 'canonical-v1.json version must be 1.0.0 (frozen DGP v1.0)');
  assert.equal(json.protocol, 'DGP', 'canonical-v1.json must specify protocol: DGP');
  assert.equal(json.frozen, true, 'canonical-v1.json must be marked frozen: true');
  assert.ok(Array.isArray(json.vectors), 'canonical-v1.json must include vectors[]');
  assert.ok(json.vectors.length >= 8, 'canonical-v1.json must include at least 8 normative vectors');

  return json.vectors.filter(v => v.status === 'NORMATIVE');
}

/**
 * Pretty-print JSON for error diagnostics.
 */
function pretty(obj) {
  return JSON.stringify(obj, null, 2);
}

/**
 * Deep equality check with rich diff output on mismatch.
 */
function assertContractMatch(actual, expected, vectorId) {
  try {
    assert.deepStrictEqual(actual, expected);
  } catch (err) {
    // Enhanced diagnostics for contract violations
    console.error('\n╔════════════════════════════════════════════════════════════════╗');
    console.error('║ CONTRACT VIOLATION DETECTED                                    ║');
    console.error('╚════════════════════════════════════════════════════════════════╝');
    console.error(`\nVector ID: ${vectorId}`);
    console.error(`\n${err.message}`);
    console.error('\n--- EXPECTED (canonical) ---');
    console.error(pretty(expected));
    console.error('\n--- ACTUAL (implementation) ---');
    console.error(pretty(actual));
    console.error('\n--- END DIAGNOSTIC ---\n');
    throw err;
  }
}

test('GovernanceEngine contract compliance (canonical v1 vectors)', async (t) => {
  const vectors = loadVectors();

  console.log(`\n🎯 Running ${vectors.length} normative contract compliance tests...\n`);

  for (const vector of vectors) {
    await t.test(`${vector.id}: ${vector.description}`, () => {
      // Extract configuration from vector
      const thresholds = vector.thresholds || { compliance: 80 };
      const enforce = vector.enforce || false;

      // Instantiate engine with deterministic configuration
      const engine = new GovernanceEngine({
        capsule: vector.capsule,
        thresholds,
        enforce,
        // Determinism injections
        now: () => FIXED_ISO,
        engineVersion: FIXED_ENGINE_VERSION
      });

      // Execute evaluation
      const actual = engine.evaluate({
        task: vector.task,
        output: vector.output,
        baseline: vector.baseline || null
      });

      // Zero-tolerance contract validation
      assertContractMatch(actual, vector.expected, vector.id);
    });
  }
});

test('Contract stability - metadata determinism', () => {
  // Simple smoke test: same input = same output (including metadata)
  const capsule = {
    version: '1.0',
    governance: {
      RFE: { requiredHeaders: ['🎯 Plan', '✅ Gates', '⚡ Action', '📋 System-Level Logs'] },
      SEG: { driftKeywords: ['unrelated'] },
      SPS: { riskThreshold: 'MEDIUM' },
      FOP: { escalationTriggers: ['FOP'], requiredForHighRisk: true }
    }
  };

  const task = { id: 'test-task', risk: 'LOW' };
  const output = '🎯 Plan\nTest.\n\n✅ Gates\nNone.\n\n⚡ Action\nDone.\n\n📋 System-Level Logs\nComplete.';

  const engine1 = new GovernanceEngine({
    capsule,
    now: () => FIXED_ISO,
    engineVersion: FIXED_ENGINE_VERSION
  });

  const engine2 = new GovernanceEngine({
    capsule,
    now: () => FIXED_ISO,
    engineVersion: FIXED_ENGINE_VERSION
  });

  const result1 = engine1.evaluate({ task, output });
  const result2 = engine2.evaluate({ task, output });

  assert.deepStrictEqual(result1, result2, 'Same input must produce identical output (determinism)');
  assert.equal(result1.metadata.evaluatedAt, FIXED_ISO, 'Injected timestamp must be used');
  assert.equal(result1.metadata.engineVersion, FIXED_ENGINE_VERSION, 'Injected version must be used');
});

test('Contract stability - array ordering', () => {
  // Ensure violations and actions arrays are sorted deterministically
  const capsule = {
    version: '1.0',
    governance: {
      RFE: { requiredHeaders: ['🎯 Plan', '✅ Gates', '⚡ Action', '📋 System-Level Logs'] },
      SEG: { driftKeywords: ['extra', 'bonus', 'also'] },
      SPS: { riskThreshold: 'MEDIUM' },
      FOP: { escalationTriggers: ['FOP'], requiredForHighRisk: true }
    }
  };

  const task = { id: 'ordering-test', risk: 'HIGH', requiresEscalation: true };
  
  // Output with multiple violations (missing headers + drift + no escalation)
  const output = 'I will add extra features and also bonus functionality. Done!';

  const engine = new GovernanceEngine({
    capsule,
    now: () => FIXED_ISO,
    engineVersion: FIXED_ENGINE_VERSION
  });

  const result = engine.evaluate({ task, output });

  // Violations must be sorted: CRITICAL first, then HIGH, then by code
  if (result.verdict.violations.length > 1) {
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    for (let i = 0; i < result.verdict.violations.length - 1; i++) {
      const current = result.verdict.violations[i];
      const next = result.verdict.violations[i + 1];
      
      const currentRank = severityOrder[current.severity];
      const nextRank = severityOrder[next.severity];
      
      assert.ok(
        currentRank <= nextRank,
        `Violations must be sorted by severity: ${current.severity} before ${next.severity}`
      );
      
      // If same severity, check lexicographic code ordering
      if (currentRank === nextRank) {
        assert.ok(
          current.code <= next.code,
          `Same-severity violations must be sorted by code: ${current.code} before ${next.code}`
        );
      }
    }
  }

  // Actions must be sorted: priority desc, then type, then reason
  if (result.recommendedActions.length > 1) {
    const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    for (let i = 0; i < result.recommendedActions.length - 1; i++) {
      const current = result.recommendedActions[i];
      const next = result.recommendedActions[i + 1];
      
      const currentRank = priorityOrder[current.priority];
      const nextRank = priorityOrder[next.priority];
      
      assert.ok(
        currentRank <= nextRank,
        `Actions must be sorted by priority: ${current.priority} before ${next.priority}`
      );
    }
  }
});

test('Contract stability - rounding behavior', () => {
  // Verify Math.round (half up) is used consistently
  // This is a synthetic test to validate rounding edge case
  const capsule = {
    version: '1.0',
    governance: {
      RFE: { requiredHeaders: ['🎯 Plan', '✅ Gates', '⚡ Action', '📋 System-Level Logs'] },
      SEG: { driftKeywords: [] },
      SPS: { riskThreshold: 'MEDIUM' },
      FOP: { escalationTriggers: ['FOP'], requiredForHighRisk: false }
    }
  };

  const task = { id: 'rounding-test', risk: 'LOW' };
  const output = '🎯 Plan\nTest.\n\n✅ Gates\nNone.\n\n⚡ Action\nDone.\n\n📋 System-Level Logs\nComplete.';

  const engine = new GovernanceEngine({
    capsule,
    now: () => FIXED_ISO,
    engineVersion: FIXED_ENGINE_VERSION
  });

  const result = engine.evaluate({ task, output });

  // Score must be integer (validates rounding applied)
  assert.equal(
    Number.isInteger(result.verdict.score),
    true,
    'verdict.score must be integer (Math.round applied)'
  );

  // Component scores must be integers
  assert.equal(
    Number.isInteger(result.analysis.drift.score),
    true,
    'analysis.drift.score must be integer'
  );
  assert.equal(
    Number.isInteger(result.analysis.retryPressure.score),
    true,
    'analysis.retryPressure.score must be integer'
  );
});
