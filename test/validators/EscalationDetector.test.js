import { describe, it } from 'node:test';
import assert from 'node:assert';
import { EscalationDetector } from '../../src/validators/EscalationDetector.js';

describe('EscalationDetector', () => {
  it('should detect explicit FOP escalation', () => {
    const detector = new EscalationDetector({ required: true });
    
    const output = 'FOP: ESCALATION TRIGGERED - Deployment requires approval';
    const result = detector.check(output);
    
    assert.strictEqual(result.escalated, true);
    assert(result.confidence >= 0.8);
    assert.strictEqual(result.correct, true);
  });

  it('should detect escalation language', () => {
    const detector = new EscalationDetector({ required: true });
    
    const output = 'This action requires founder approval before proceeding';
    const result = detector.check(output);
    
    assert.strictEqual(result.escalated, true);
    assert(result.triggers.length > 0);
  });

  it('should detect no escalation correctly', () => {
    const detector = new EscalationDetector({ required: false });
    
    const output = 'Creating plan. Action: Update documentation';
    const result = detector.check(output);
    
    assert.strictEqual(result.escalated, false);
    assert.strictEqual(result.correct, true);
  });

  it('should detect multiple triggers with state-based confidence', () => {
    // FROZEN v1.0: Confidence is state-based (correct=true→1.0, null→0.5, false→0.0)
    // Not ratio-based (triggers/total) to prevent silent drift when capsule evolves
    const detector = new EscalationDetector({ required: true });
    
    const output = 'FOP escalation required. Requesting approval from founder.';
    const result = detector.check(output);
    
    assert(result.triggers.length >= 2);
    assert.strictEqual(result.escalated, true);
    assert.strictEqual(result.correct, true); // Required and present
    assert.strictEqual(result.confidence, 1.0); // State-based: correct=true → 1.0
  });

  it('should support custom triggers', () => {
    const detector = new EscalationDetector({ 
      triggers: ['custom approval needed'] 
    });
    
    const output = 'custom approval needed for this operation';
    const result = detector.check(output);
    
    assert(result.triggers.includes('custom approval needed'));
  });

  it('should handle batch checking', () => {
    const detector = new EscalationDetector();
    
    const outputs = [
      { output: 'FOP: Escalating to founder', required: true },
      { output: 'Creating simple plan', required: false },
      { output: 'FOP escalation', required: true }
    ];
    
    const batchResult = detector.checkBatch(outputs);
    
    assert(batchResult.precision >= 0);
    assert(batchResult.recall >= 0);
    assert.strictEqual(batchResult.results.length, 3);
  });

  it('should return null correctness when not specified', () => {
    const detector = new EscalationDetector();
    
    const output = 'Some output without escalation';
    const result = detector.check(output);
    
    assert.strictEqual(result.correct, null);
  });

  it('should use confidence threshold', () => {
    const strictDetector = new EscalationDetector({ confidenceThreshold: 0.9 });
    const lenientDetector = new EscalationDetector({ confidenceThreshold: 0.5 });
    
    const ambiguous = 'Maybe need approval';
    
    const strictResult = strictDetector.check(ambiguous);
    const lenientResult = lenientDetector.check(ambiguous);
    
    // Both detect triggers but may differ on escalation decision
    assert.strictEqual(typeof strictResult.escalated, 'boolean');
    assert.strictEqual(typeof lenientResult.escalated, 'boolean');
  });
});
