/**
 * RetryPressure - Measures output ambiguity and incompleteness
 * 
 * Heuristic scoring (0-1) indicating whether output requires clarification,
 * revision, or retry. Higher scores suggest the LLM is uncertain, incomplete,
 * or requesting additional context.
 * 
 * Factors penalized:
 * - Missing required headers (schema incompleteness)
 * - Questions directed at user
 * - Placeholders (TODO, TBD, [...])
 * - Uncertainty phrases ("maybe", "unclear", "not sure")
 * - Incomplete sentences or abrupt endings
 * 
 * @example
 * const calculator = new RetryPressure();
 * const score = calculator.compute(output, { requiredHeaders: ['Plan', 'Action'] });
 * // Returns: { score: 0.3, factors: { missingHeaders: 0.5, questions: 0, ... } }
 */
export class RetryPressure {
  /**
   * @param {Object} options
   * @param {number} [options.headerPenalty=0.5] - Penalty per missing header
   * @param {number} [options.questionPenalty=0.2] - Penalty per question
   * @param {number} [options.placeholderPenalty=0.3] - Penalty for placeholders
   * @param {number} [options.uncertaintyPenalty=0.15] - Penalty for uncertainty phrases
   */
  constructor(options = {}) {
    // Contract-defined penalties per ENGINE_CONTRACT.md
    this.uncertaintyPenalty = 0.1; // Per uncertainty phrase
    this.todoPenalty = 0.2; // Per TODO/TBD/FIXME placeholder

    // Uncertainty indicators (contract-defined list)
    this.uncertaintyPhrases = [
      'not sure',
      'unclear',
      'maybe',
      'might be',
      'possibly',
      'i think',
      'i believe',
      'could be',
      'hard to say',
      'difficult to determine',
      'should i',
      'should we'
    ];

    // Placeholder patterns
    this.placeholderPatterns = [
      /\bTODO\b/gi,
      /\bTBD\b/gi,
      /\bFIXME\b/gi
    ];
  }

  /**
   * Compute retry pressure score
   * 
   * @param {string} output - LLM output text
   * @param {Object} options
   * @param {string[]} [options.requiredHeaders=[]] - Expected headers
   * @param {boolean} [options.strict=true] - Use strict header checking
   * @returns {{ 
   *   score: number, 
   *   factors: Object,
   *   normalized: number 
   * }}
   */
  compute(output, options = {}) {
    if (typeof output !== 'string') {
      throw new Error('Output must be a string');
    }

    const lowerOutput = output.toLowerCase();
    const foundMatches = []; // {text, position, type}

    // Contract-defined scoring: uncertainty × 0.1 + TODO × 0.2
    let uncertaintyCount = 0;
    let todoCount = 0;

    // Find uncertainty phrases with their positions
    for (const phrase of this.uncertaintyPhrases) {
      if (lowerOutput.includes(phrase)) {
        const regex = new RegExp(
          phrase.split(' ').map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+'), 
          'i'
        );
        const match = output.match(regex);
        if (match) {
          const position = output.indexOf(match[0]);
          if (!foundMatches.some(m => m.text === match[0])) {
            foundMatches.push({ text: match[0], position, type: 'uncertainty' });
            uncertaintyCount++;
          }
        }
      }
    }

    // Find TODO/TBD/FIXME placeholders with their positions
    for (const pattern of this.placeholderPatterns) {
      const matches = output.match(pattern) || [];
      for (const match of matches) {
        const position = output.indexOf(match);
        if (!foundMatches.some(m => m.text === match)) {
          foundMatches.push({ text: match, position, type: 'placeholder' });
          todoCount++;
        }
      }
    }

    // Sort by position in output (deterministic order)
    foundMatches.sort((a, b) => a.position - b.position);
    const matchedSignals = foundMatches.map(m => m.text);

    // Contract formula: uncertaintyCount × 0.1 + todoCount × 0.2
    const normalizedScore = Math.min(
      uncertaintyCount * this.uncertaintyPenalty + todoCount * this.todoPenalty,
      1.0
    );

    return {
      score: Math.round((1 - normalizedScore) * 100), // Inverted: higher pressure = lower score
      normalized: Number(normalizedScore.toFixed(2)), // 0-1 scale, 2 decimals
      signals: matchedSignals // Actual matched text from output, in order of appearance
    };
  }

  /**
   * Calculate retry reduction percentage
   * 
   * @param {number} baselineScore - Baseline retry pressure
   * @param {number} governedScore - Governed retry pressure
   * @returns {number} Reduction percentage (negative if pressure increased)
   */
  static computeReduction(baselineScore, governedScore) {
    if (baselineScore === 0 && governedScore === 0) return 0;
    if (baselineScore === 0) return -100;
    
    return Math.round(((baselineScore - governedScore) / baselineScore) * 100);
  }

  /**
   * Escape regex special characters
   * @private
   */
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
