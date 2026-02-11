/**
 * @dealgo/governance-sdk
 * 
 * Vendor-agnostic AI governance through portable constraint capsules.
 * 
 * @example
 * import { GovernanceEngine, Capsule, OpenAIProvider } from '@dealgo/governance-sdk';
 * 
 * const capsule = await Capsule.load('./capsule.v1.compact.json');
 * const provider = new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY });
 * const engine = new GovernanceEngine({ capsule, provider });
 * 
 * const result = await engine.run({
 *   id: 'release-plan',
 *   description: 'Generate release plan',
 *   constraints: ['Do not deploy until tests pass']
 * });
 */

// Core
export { GovernanceEngine } from './core/index.js';

// Validators
export {
  DriftDetector,
  HeaderChecker,
  EscalationDetector,
  RetryPressure
} from './validators/index.js';

// Core (to be implemented)
// export { GovernanceEngine, Capsule, Task } from './core/index.js';

// Providers (to be implemented)
// export { OpenAIProvider, GeminiProvider } from './providers/index.js';
