import { GovernanceEngine } from './src/core/GovernanceEngine.js';
import { readFileSync } from 'fs';

const vectors = JSON.parse(readFileSync('test/vectors/canonical-v1.json')).vectors;
const v07 = vectors.find(x => x.id === 'v1-07-rounding-boundary');

const engine = new GovernanceEngine({
  capsule: v07.capsule,
  thresholds: { compliance: 80 },
  now: () => new Date('2026-02-11T00:00:00.000Z')
});

const result = engine.evaluate({ task: v07.task, output: v07.output, baseline: v07.baseline });

console.log('v1-07 ACTUAL retryPressure:', JSON.stringify(result.analysis.retryPressure, null, 2));
console.log('\nv1-07 EXPECTED retryPressure:', JSON.stringify(v07.expected.analysis.retryPressure, null, 2));
console.log('\nv1-07 ACTUAL verdict:', result.verdict.score, result.verdict.compliant, result.verdict.confidence);
console.log('v1-07 EXPECTED verdict:', v07.expected.verdict.score, v07.expected.verdict.compliant, v07.expected.verdict.confidence);
console.log('\nACTUAL actions:', JSON.stringify(result.recommendedActions, null, 2));
console.log('\nEXPECTED actions:', JSON.stringify(v07.expected.recommendedActions, null, 2));
