# @dealgo/governance-sdk

> Vendor-agnostic AI governance through portable constraint capsules

[![npm version](https://img.shields.io/npm/v/@dealgo/governance-sdk.svg)](https://www.npmjs.com/package/@dealgo/governance-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![DGP v1.0](https://img.shields.io/badge/DGP-v1.0%20Conformant-brightgreen.svg)](https://github.com/dgp-standard/dgp-standard-dgp-spec)

✅ **DGP v1.0 Conformant** — Passes all 8 canonical protocol vectors with bit-for-bit accuracy.

**Protocol Spec:** [DeAlgo Governance Protocol (DGP) v1.0](https://github.com/dgp-standard/dgp-standard-dgp-spec)

## Overview

The Governance SDK enables **inference-time governance** across multiple LLM vendors (OpenAI, Google, Anthropic) without fine-tuning. Control AI behavior through portable JSON constraint capsules that enforce:

- **RFE** (Reflection-First Execution): Plan before acting
- **SPS** (Stability-Preserving Steps): Prefer safe operations  
- **SEG** (Scope-Enforcing Gates): Respect task boundaries
- **FOP** (Founder-Oversight Protocol): Escalate high-risk actions

## Quick Start

**Reference Implementation** (evaluates LLM output against governance policy):

```bash
npm install @dealgo/governance-sdk
```

```javascript
import { GovernanceEngine } from './src/core/GovernanceEngine.js';

// Create engine with deterministic time injection
const engine = new GovernanceEngine({ 
  now: () => "2026-02-11T00:00:00.000Z", 
  engineVersion: "1.0.0" 
});

// Evaluate LLM output against capsule policy
const report = engine.evaluate({ 
  capsule,   // Governance policy (JSON)
  task,      // Task context (scope, risk level)
  output,    // LLM-generated text to evaluate
  baseline   // Optional: previous output for drift comparison
});

// Use verdict to gate/retry/escalate/block
console.log(report.verdict);        // "ALLOW" | "RETRY" | "ESCALATE" | "BLOCK"
console.log(report.analysis.score); // 0-100 compliance score
console.log(report.violations);     // Detected violations (if any)
console.log(report.actions);        // Recommended actions
```

**See [DGP.md](./DGP.md) for protocol overview and integration patterns.**

---

## Protocol Conformance

This SDK is the **reference implementation** of the **DeAlgo Governance Protocol (DGP) v1.0**.

**Validate conformance:**

```bash
node --test test/contract-compliance.test.js
```

**Expected:** 8/8 canonical vectors passing (bit-for-bit match).

**Protocol artifacts:**
- **Spec (RFC):** [ENGINE_CONTRACT.md](./docs/ENGINE_CONTRACT.md)  
- **Conformance Suite:** [canonical-v1.json](./test/vectors/canonical-v1.json) (8 normative test vectors)  
- **Conformance Guide:** [CONFORMANCE.md](./CONFORMANCE.md)

**DGP positioning:** *OAuth + OpenAPI + PCI for AI governance*

---

## Features

- ✅ **Multi-vendor support**: OpenAI GPT, Google Gemini, Anthropic Claude
- ✅ **Zero fine-tuning**: Governance via prompt injection, not training
- ✅ **Portable constraints**: Single JSON spec works across all models
- ✅ **Production-ready**: Retry logic, rate limiting, error handling
- ✅ **Extensible**: Custom validators, capsules, and providers

## Documentation

- [Quick Start Guide](./docs/quick-start.md)
- [API Reference](./docs/api-reference.md)
- [Custom Capsules](./docs/custom-capsules.md)
- [Framework Integration](./docs/framework-integration.md)

## Research

Based on peer-reviewed research validating portability across GPT-4o-mini, Claude Sonnet 4.5, and Gemini 2.0 Flash:

> **Paper**: [Inference-Time Governance via Portable Constraint Capsules](https://arxiv.org/abs/2602.xxxxx)  
> **Validation**: 2/3 models achieved ≥30% drift reduction, 3/3 achieved perfect scope compliance

## Examples

See [examples/](./examples) for:
- Basic usage with single provider
- Custom capsule creation
- Multi-provider comparison
- Framework integrations (Express, Next.js, LangChain)

## License

MIT © DeAlgo Labs

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

**Questions?** Open an issue or join our [Discord](https://discord.gg/dealgo)
