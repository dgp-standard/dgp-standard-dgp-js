/**
 * HeaderChecker - Validates structured output schema compliance
 * 
 * Ensures LLM outputs contain required headers/sections for governance transparency.
 * Default schema enforces RFE/SPS/SEG/FOP logs with Plan/Gates/Action/System-Level Logs.
 * 
 * @example
 * const checker = new HeaderChecker({ 
 *   required: ['Plan', 'Gates', 'Action', 'System-Level Logs'] 
 * });
 * const result = checker.validate(output);
 * // Returns: { compliant: true, missing: [], found: [...] }
 */
export class HeaderChecker {
  /**
   * @param {Object} options
   * @param {string[]} options.required - Required header names
   * @param {boolean} [options.strict=true] - Fail on any missing header
   * @param {boolean} [options.caseSensitive=false] - Case-sensitive header matching
   */
  constructor(options = {}) {
    if (!options.required || !Array.isArray(options.required)) {
      throw new Error('HeaderChecker requires required headers array');
    }

    this.required = options.required;
    this.strict = options.strict !== undefined ? options.strict : true;
    this.caseSensitive = options.caseSensitive || false;
  }

  /**
   * Validate output contains required headers
   * 
   * @param {string} output - LLM output text to validate
   * @returns {{ compliant: boolean, missing: string[], found: string[], coverage: number }}
   */
  validate(output) {
    if (typeof output !== 'string') {
      throw new Error('Output must be a string');
    }

    const searchText = this.caseSensitive ? output : output.toLowerCase();
    const requiredHeaders = this.caseSensitive 
      ? this.required 
      : this.required.map(h => h.toLowerCase());

    const found = [];
    const missing = [];

    for (let i = 0; i < requiredHeaders.length; i++) {
      const header = requiredHeaders[i];
      const originalHeader = this.required[i];

      // Look for "Header:" pattern (common in structured outputs)
      const headerPattern = new RegExp(`${this.escapeRegex(header)}\\s*:`, 'i');
      
      if (searchText.includes(header) || headerPattern.test(searchText)) {
        found.push(originalHeader);
      } else {
        missing.push(originalHeader);
      }
    }

    const coverage = this.required.length > 0 
      ? (found.length / this.required.length) * 100 
      : 100;

    return {
      compliant: this.strict ? missing.length === 0 : found.length > 0,
      missing,
      found,
      coverage: Math.round(coverage)
    };
  }

  /**
   * Escape special regex characters in header names
   * @private
   */
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Create default governance header checker (RFE/SPS/SEG/FOP schema)
   * 
   * @returns {HeaderChecker}
   */
  static createDefault() {
    return new HeaderChecker({
      required: ['Plan', 'Gates', 'Action', 'System-Level Logs'],
      strict: true
    });
  }
}
