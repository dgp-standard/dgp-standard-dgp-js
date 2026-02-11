import { describe, it } from 'node:test';
import assert from 'node:assert';
import { RetryPressure } from '../../src/validators/RetryPressure.js';

describe('RetryPressure', () => {
  it('should detect uncertainty in output', () => {
    // FROZEN v1.0: Detects uncertainty phrases only (not headers/questions)
    const calculator = new RetryPressure();
    
    const output = 'Not sure if this is the right approach. Maybe we should reconsider?';
    const result = calculator.compute(output);
    
    assert(result.normalized > 0); // Has uncertainty pressure
    assert(result.signals.length > 0); // Found uncertainty phrases
    assert(result.score < 100); // Not perfect
  });

  it('should detect uncertainty from questions', () => {
    const calculator = new RetryPressure();
    
    const output = 'Should I proceed? Should we continue with this plan?';
    const result = calculator.compute(output);
    
    // FROZEN v1.0: "should i" and "should we" are uncertainty phrases
    assert(result.normalized > 0);
    assert(result.signals.length >= 2); // Should match both phrases
  });

  it('should detect placeholders', () => {
    const calculator = new RetryPressure();
    
    const output = 'Plan: TODO - need more details\nAction: [...]';
    const result = calculator.compute(output);
    
    // FROZEN v1.0: TODO is a placeholder (todoPenalty = 0.2)
    assert(result.normalized >= 0.2); // At least one TODO
    assert(result.signals.some(s => s.includes('TODO')));
  });

  it('should detect uncertainty phrases', () => {
    const calculator = new RetryPressure();
    
    const output = 'I think this might work, but it is unclear if we should proceed';
    const result = calculator.compute(output);
    
    // FROZEN v1.0: signals contain matched uncertainty phrases
    assert(result.normalized > 0); // Has pressure from uncertainty
    assert(result.signals.length > 0); // Found uncertainty phrases
    assert(result.score < 100); // Not perfect due to uncertainty
  });

  it('should return low score for clean output', () => {
    const calculator = new RetryPressure();
    
    const output = `
Plan: Create release branch from main
Gates: Tests must pass before deployment
Action: Execute git checkout -b release/v1.4
System-Level Logs: RFE/SPS/SEG/FOP checks complete
    `.trim();
    
    const result = calculator.compute(output, {
      requiredHeaders: ['Plan', 'Gates', 'Action', 'System-Level Logs']
    });
    
    // FROZEN v1.0: score is 0-100 inverted (100 = perfect, 0 = max pressure)
    assert.strictEqual(result.score, 100); // No uncertainty/TODO = perfect score
    assert.strictEqual(result.normalized, 0); // 0 pressure
  });

  it('should cap normalized at 1.0', () => {
    const calculator = new RetryPressure();
    
    const chaotic = `
??? What should I do?
Maybe try this? Not sure though.
TODO: Figure this out
[...placeholder...]
I think it might work but unclear
    `.trim();
    
    const result = calculator.compute(chaotic, {
      requiredHeaders: ['Plan', 'Gates', 'Action', 'System-Level Logs']
    });
    
    // FROZEN v1.0: normalized must be capped at 1.0 (max pressure)
    assert(result.normalized <= 1.0);
    assert(result.normalized >= 0);
  });

  it('should compute reduction correctly', () => {
    assert.strictEqual(RetryPressure.computeReduction(0.5, 0.25), 50);
    assert.strictEqual(RetryPressure.computeReduction(0.1, 0.05), 50);
    assert.strictEqual(RetryPressure.computeReduction(0.1, 0.15), -50);
  });

  it('should use frozen penalty values', () => {
    // FROZEN v1.0: penalties are hardcoded per ENGINE_CONTRACT.md
    // uncertaintyPenalty = 0.1, todoPenalty = 0.2 (not customizable in v1.0)
    const calculator = new RetryPressure();
    
    const output = 'Maybe we should try this? TODO: confirm approach';
    const result = calculator.compute(output);
    
    // With 1 uncertainty ("maybe") + 1 TODO:
    // normalized = 1 × 0.1 + 1 × 0.2 = 0.3
    assert.strictEqual(result.normalized, 0.3);
    assert.strictEqual(result.score, 70); // (1 - 0.3) × 100 = 70
  });

  it('should calculate normalized score 0-1 scale', () => {
    const calculator = new RetryPressure();
    
    const output = 'What should I do?';
    const result = calculator.compute(output);
    
    // FROZEN v1.0: normalized is 0-1 scale, score is 0-100
    assert.strictEqual(typeof result.normalized, 'number');
    assert(result.normalized >= 0 && result.normalized <= 1.0);
    assert(result.score >= 0 && result.score <= 100);
  });
});
