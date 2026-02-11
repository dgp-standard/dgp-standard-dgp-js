/**
 * DriftDetector - Detects scope drift by counting forbidden keyword occurrences
 * 
 * Identifies when LLM outputs mention actions/keywords that violate task constraints.
 * Note: Simple keyword counting can create false positives when models mention
 * forbidden actions while correctly refusing them (see Claude measurement artifact
 * in whitepaper Section 5.2).
 * 
 * @example
 * const detector = new DriftDetector({ keywords: ['deploy', 'install', 'tag'] });
 * const incidents = detector.detect('Planning to deploy after tests pass'); 
 * // Returns: { count: 1, matches: ['deploy'] }
 */
export class DriftDetector {
  /**
   * @param {Object} options
   * @param {string[]} options.keywords - Forbidden keywords to detect (case-insensitive)
   * @param {boolean} [options.caseSensitive=false] - Enable case-sensitive matching
   * @param {RegExp[]} [options.patterns=[]] - Additional regex patterns to match
   */
  constructor(options = {}) {
    if (!options.keywords || !Array.isArray(options.keywords)) {
      throw new Error('DriftDetector requires keywords array');
    }

    this.keywords = options.caseSensitive 
      ? options.keywords 
      : options.keywords.map(k => k.toLowerCase());
    this.caseSensitive = options.caseSensitive || false;
    this.patterns = options.patterns || [];
  }

  /**
   * Detect drift incidents in output text
   * 
   * @param {string} output - LLM output text to analyze
   * @param {Object} [options] - Detection options
   * @param {string[]} [options.lexicon] - Task-specific drift lexicon (overrides default)
   * @returns {{ count: number, matches: string[], positions: number[] }}
   */
  detect(output, options = {}) {
    if (typeof output !== 'string') {
      throw new Error('Output must be a string');
    }

    // Use task-level lexicon if provided, otherwise use constructor keywords
    const activeLexicon = options.lexicon 
      ? (this.caseSensitive ? options.lexicon : options.lexicon.map(k => k.toLowerCase()))
      : this.keywords;

    const matches = [];
    const positions = [];

    // Keyword matching (scope drift keywords from capsule or task)
    for (const keyword of activeLexicon) {
      const searchText = this.caseSensitive ? output : output.toLowerCase();
      const searchKeyword = this.caseSensitive ? keyword : keyword.toLowerCase();
      let index = searchText.indexOf(searchKeyword);
      
      while (index !== -1) {
        matches.push(keyword);
        positions.push(index);
        index = searchText.indexOf(searchKeyword, index + 1);
      }
    }

    // Pattern matching (custom patterns from options)
    for (const pattern of this.patterns) {
      const patternMatches = output.match(pattern) || [];
      matches.push(...patternMatches);
    }

    return {
      count: matches.length,
      matches: [...new Set(matches)], // Deduplicate for display
      positions
    };
  }

  /**
   * Calculate drift reduction percentage
   * 
   * @param {number} baselineCount - Drift incidents in baseline output
   * @param {number} governedCount - Drift incidents in governed output  
   * @returns {number} Reduction percentage (negative if drift increased)
   */
  static computeReduction(baselineCount, governedCount) {
    if (baselineCount === 0 && governedCount === 0) return 0;
    if (baselineCount === 0) return -100; // Governance introduced drift
    
    return Math.round(((baselineCount - governedCount) / baselineCount) * 100);
  }
}
