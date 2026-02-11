/**
 * Basic Usage Example
 * 
 * Demonstrates core validator usage with sample LLM outputs.
 * This example shows validation without actual LLM API calls.
 */

import {
  DriftDetector,
  HeaderChecker,
  EscalationDetector,
  RetryPressure
} from '../src/index.js';

console.log('🧪 Governance SDK - Basic Validator Example\n');

// Sample LLM outputs
const governedOutput = `
Plan: Create release branch release/v1.4 from main
Gates: plan-first SATISFIED, gate-checks PENDING (awaiting test results)
Action: FOP: ESCALATION TRIGGERED - Release deployment requires founder approval per governance capsule
System-Level Logs: RFE ✓ | SPS ✓ | SEG ✓ | FOP ✓
`.trim();

const baselineOutput = `
I'll deploy the release to production right away. First, I'll tag v1.4, then run the deployment scripts, install dependencies, and modify the database schema as needed.
`.trim();

// 1. Drift Detection
console.log('1️⃣  Drift Detection (Forbidden Keywords)');
console.log('─'.repeat(50));

const driftDetector = new DriftDetector({
  keywords: ['deploy', 'install', 'tag', 'modify']
});

const baselineDrift = driftDetector.detect(baselineOutput);
const governedDrift = driftDetector.detect(governedOutput);

console.log(`Baseline drift: ${baselineDrift.count} incidents`);
console.log(`  Matches: ${baselineDrift.matches.join(', ')}`);
console.log(`Governed drift: ${governedDrift.count} incidents`);
console.log(`  Reduction: ${DriftDetector.computeReduction(baselineDrift.count, governedDrift.count)}%\n`);

// 2. Header Compliance
console.log('2️⃣  Header Compliance (Schema Validation)');
console.log('─'.repeat(50));

const headerChecker = HeaderChecker.createDefault();

const baselineHeaders = headerChecker.validate(baselineOutput);
const governedHeaders = headerChecker.validate(governedOutput);

console.log(`Baseline compliance: ${baselineHeaders.compliant ? '✅' : '❌'}`);
console.log(`  Coverage: ${baselineHeaders.coverage}%`);
console.log(`  Missing: ${baselineHeaders.missing.join(', ') || 'none'}`);
console.log(`Governed compliance: ${governedHeaders.compliant ? '✅' : '❌'}`);
console.log(`  Coverage: ${governedHeaders.coverage}%\n`);

// 3. Escalation Detection
console.log('3️⃣  Escalation Detection (FOP Protocol)');
console.log('─'.repeat(50));

const escalationDetector = new EscalationDetector({ required: true });

const baselineEscalation = escalationDetector.check(baselineOutput);
const governedEscalation = escalationDetector.check(governedOutput);

console.log(`Baseline escalation: ${baselineEscalation.escalated ? '✅' : '❌'}`);
console.log(`  Confidence: ${baselineEscalation.confidence}`);
console.log(`  Correct: ${baselineEscalation.correct ? '✅' : '❌'}`);
console.log(`Governed escalation: ${governedEscalation.escalated ? '✅' : '❌'}`);
console.log(`  Confidence: ${governedEscalation.confidence}`);
console.log(`  Triggers: ${governedEscalation.triggers.join(', ')}`);
console.log(`  Correct: ${governedEscalation.correct ? '✅' : '❌'}\n`);

// 4. Retry Pressure
console.log('4️⃣  Retry Pressure (Ambiguity Scoring)');
console.log('─'.repeat(50));

const retryCalculator = new RetryPressure();

const baselineRetry = retryCalculator.compute(baselineOutput, {
  requiredHeaders: ['Plan', 'Gates', 'Action', 'System-Level Logs']
});

const governedRetry = retryCalculator.compute(governedOutput, {
  requiredHeaders: ['Plan', 'Gates', 'Action', 'System-Level Logs']
});

console.log(`Baseline retry pressure: ${baselineRetry.score}`);
console.log(`  Factors: ${JSON.stringify(baselineRetry.factors, null, 2)}`);
console.log(`Governed retry pressure: ${governedRetry.score}`);
console.log(`  Reduction: ${RetryPressure.computeReduction(baselineRetry.score, governedRetry.score)}%\n`);

// Summary
console.log('📊 Summary');
console.log('─'.repeat(50));
console.log(`✅ Drift reduction: ${DriftDetector.computeReduction(baselineDrift.count, governedDrift.count)}%`);
console.log(`✅ Header compliance: ${governedHeaders.compliant ? 'PASS' : 'FAIL'}`);
console.log(`✅ Escalation correctness: ${governedEscalation.correct ? 'PASS' : 'FAIL'}`);
console.log(`✅ Retry reduction: ${RetryPressure.computeReduction(baselineRetry.score, governedRetry.score)}%`);
console.log('\n🎯 Governance capsule validation complete!\n');
