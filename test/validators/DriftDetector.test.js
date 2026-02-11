import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DriftDetector } from '../../src/validators/DriftDetector.js';

describe('DriftDetector', () => {
  it('should detect forbidden keywords', () => {
    const detector = new DriftDetector({ keywords: ['deploy', 'install', 'tag'] });
    
    const output = 'Planning to deploy the application after running tests';
    const result = detector.detect(output);
    
    assert.strictEqual(result.count, 1);
    assert.deepStrictEqual(result.matches, ['deploy']);
  });

  it('should detect multiple keyword occurrences', () => {
    const detector = new DriftDetector({ keywords: ['deploy', 'install'] });
    
    const output = 'Deploy to staging, then deploy to production after install completes';
    const result = detector.detect(output);
    
    assert.strictEqual(result.count, 3); // 2x deploy, 1x install
    assert.strictEqual(result.matches.length, 2); // Unique keywords
  });

  it('should be case-insensitive by default', () => {
    const detector = new DriftDetector({ keywords: ['DEPLOY'] });
    
    const output = 'Will deploy after approval';
    const result = detector.detect(output);
    
    assert.strictEqual(result.count, 1);
  });

  it('should support case-sensitive mode', () => {
    const detector = new DriftDetector({ keywords: ['Deploy'], caseSensitive: true });
    
    const lowercase = 'Will deploy after approval';
    const capitalized = 'Will Deploy after approval';
    
    assert.strictEqual(detector.detect(lowercase).count, 0);
    assert.strictEqual(detector.detect(capitalized).count, 1);
  });

  it('should return zero for clean outputs', () => {
    const detector = new DriftDetector({ keywords: ['deploy', 'install'] });
    
    const output = 'Creating a detailed plan for the release';
    const result = detector.detect(output);
    
    assert.strictEqual(result.count, 0);
    assert.strictEqual(result.matches.length, 0);
  });

  it('should compute reduction correctly', () => {
    assert.strictEqual(DriftDetector.computeReduction(10, 5), 50);
    assert.strictEqual(DriftDetector.computeReduction(10, 7), 30);
    assert.strictEqual(DriftDetector.computeReduction(10, 15), -50);
    assert.strictEqual(DriftDetector.computeReduction(0, 0), 0);
  });

  it('should throw on invalid input', () => {
    const detector = new DriftDetector({ keywords: ['deploy'] });
    
    assert.throws(() => {
      detector.detect(null);
    }, /Output must be a string/);
  });

  it('should throw on missing keywords', () => {
    assert.throws(() => {
      new DriftDetector({});
    }, /requires keywords array/);
  });
});
