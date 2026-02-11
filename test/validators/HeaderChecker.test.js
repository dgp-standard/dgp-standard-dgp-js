import { describe, it } from 'node:test';
import assert from 'node:assert';
import { HeaderChecker } from '../../src/validators/HeaderChecker.js';

describe('HeaderChecker', () => {
  it('should validate all headers present', () => {
    const checker = new HeaderChecker({ 
      required: ['Plan', 'Gates', 'Action', 'System-Level Logs'] 
    });
    
    const output = `
Plan: Create release branch
Gates: Tests must pass
Action: None until approved
System-Level Logs: RFE/SPS/SEG/FOP
    `.trim();
    
    const result = checker.validate(output);
    
    assert.strictEqual(result.compliant, true);
    assert.strictEqual(result.missing.length, 0);
    assert.strictEqual(result.found.length, 4);
    assert.strictEqual(result.coverage, 100);
  });

  it('should detect missing headers in strict mode', () => {
    const checker = new HeaderChecker({ 
      required: ['Plan', 'Action'],
      strict: true
    });
    
    const output = 'Plan: Do something important';
    const result = checker.validate(output);
    
    assert.strictEqual(result.compliant, false);
    assert.deepStrictEqual(result.missing, ['Action']);
    assert.strictEqual(result.coverage, 50);
  });

  it('should be lenient in non-strict mode', () => {
    const checker = new HeaderChecker({ 
      required: ['Plan', 'Action'],
      strict: false
    });
    
    const output = 'Plan: Do something';
    const result = checker.validate(output);
    
    assert.strictEqual(result.compliant, true); // At least one header found
  });

  it('should be case-insensitive by default', () => {
    const checker = new HeaderChecker({ required: ['PLAN', 'ACTION'] });
    
    const output = 'plan: Something\naction: Something else';
    const result = checker.validate(output);
    
    assert.strictEqual(result.compliant, true);
  });

  it('should detect headers with colon pattern', () => {
    const checker = new HeaderChecker({ required: ['Status'] });
    
    const withColon = 'Status: Active';
    const withoutColon = 'Status Active';
    
    assert.strictEqual(checker.validate(withColon).compliant, true);
    assert.strictEqual(checker.validate(withoutColon).compliant, true);
  });

  it('should create default checker', () => {
    const checker = HeaderChecker.createDefault();
    
    assert.strictEqual(checker.required.length, 4);
    assert.strictEqual(checker.strict, true);
  });

  it('should calculate coverage percentage', () => {
    const checker = new HeaderChecker({ required: ['A', 'B', 'C', 'D'] });
    
    const halfCoverage = 'A: yes\nB: yes';
    const result = checker.validate(halfCoverage);
    
    assert.strictEqual(result.coverage, 50);
  });

  it('should throw on invalid input', () => {
    const checker = new HeaderChecker({ required: ['Plan'] });
    
    assert.throws(() => {
      checker.validate(123);
    }, /Output must be a string/);
  });
});
