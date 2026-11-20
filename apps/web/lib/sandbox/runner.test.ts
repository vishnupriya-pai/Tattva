import { describe, expect, it } from 'vitest';
import { executeCodeChallenge } from './runner';

describe('Client-Side Code Challenge Runner', () => {
  it('successfully executes JavaScript algorithmic challenges with passing assertions', async () => {
    const userCode = `
      function scaledDotProduct(score, d_k) {
        return score / Math.sqrt(d_k);
      }
    `;

    const testCode = `
      assert(scaledDotProduct(16, 64) === 2, "16 / sqrt(64) must equal 2", 2, scaledDotProduct(16, 64));
      assert(scaledDotProduct(100, 25) === 20, "100 / sqrt(25) must equal 20", 20, scaledDotProduct(100, 25));
    `;

    const result = await executeCodeChallenge('javascript', userCode, testCode);
    expect(result.success).toBe(true);
    expect(result.passedTests).toBe(2);
    expect(result.totalTests).toBe(2);
    expect(result.testCases[0].passed).toBe(true);
  });

  it('detects failing assertions and reports expected vs actual values', async () => {
    const faultyCode = `
      function scaledDotProduct(score, d_k) {
        return score; // Forgot to divide by sqrt(d_k)
      }
    `;

    const testCode = `
      assert(scaledDotProduct(16, 64) === 2, "16 / sqrt(64) must equal 2", 2, scaledDotProduct(16, 64));
    `;

    const result = await executeCodeChallenge('javascript', faultyCode, testCode);
    expect(result.success).toBe(false);
    expect(result.passedTests).toBe(0);
    expect(result.testCases[0].passed).toBe(false);
    expect(result.testCases[0].actual).toBe('16');
    expect(result.testCases[0].expected).toBe('2');
  });

  it('gracefully catches runtime syntax errors', async () => {
    const brokenCode = `function broken( { return 42; }`;
    const testCode = `assert(true, "trivial");`;

    const result = await executeCodeChallenge('javascript', brokenCode, testCode);
    expect(result.success).toBe(false);
    expect(result.runtimeError).toBeDefined();
  });
});
