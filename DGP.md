# DeAlgo Governance Protocol (DGP)

**Version:** 1.0.0 (FROZEN)  
**Effective:** February 11, 2026  
**Status:** Protocol Standard  

---

## The Triangle

DGP connects three artifacts to produce deterministic governance decisions:

```
┌─────────────┐      ┌─────────────┐      ┌──────────────────┐
│   Capsule   │ ──┬─▶│   Output    │ ───▶ │ ComplianceReport │
│  (Policy)   │   │  │ (LLM text)  │      │   (Decision)     │
└─────────────┘   │  └─────────────┘      └──────────────────┘
                  │
                  └─▶ Task context (optional)
                      Baseline output (optional)
```

**Input:**
1. **Capsule** (JSON): Portable governance policy defining constraints
2. **Output** (string): LLM-generated text to evaluate
3. **Task** (JSON, optional): Context (scope, risk level, escalation requirements)
4. **Baseline** (JSON, optional): Previous output for drift/pressure comparison

**Output:**
- **ComplianceReport** (JSON): Structured governance decision with scores, violations, actions, confidence

---

## What DGP Does

**Evaluates LLM outputs against portable policies without fine-tuning.**

DGP answers:
- ✅ **ALLOW**: Safe to proceed
- 🔁 **RETRY**: Needs refinement (scope drift, uncertainty detected)
- ⚠️ **ESCALATE**: Requires human approval (FOP, high-risk action)
- 🛑 **BLOCK**: Violates critical constraints (forbidden keywords, missing escalation)

---

## What DGP Does NOT Do

❌ **Doesn't modify model internals** (no fine-tuning, no prompt injection)  
❌ **Doesn't require vendor-specific APIs** (runs on any LLM output string)  
❌ **Doesn't prevent LLM from generating bad output** (evaluates *after* generation)  
❌ **Doesn't replace content moderation** (complements it with task-specific governance)

**DGP is post-generation governance**, not pre-generation control.

---

## Four Outcomes (Ordered by Severity)

DGP evaluates across **4 dimensions** (drift, pressure, gates, escalation) and produces **1 verdict**:

### 1. **ALLOW** (85-100 score)
- **Meaning**: Output complies with all constraints
- **Action**: Proceed with LLM output
- **Example**: "Created plan without drift, proper headers, no escalation needed"

### 2. **RETRY** (50-84 score)
- **Meaning**: Output has fixable issues (scope drift, uncertainty, missing headers)
- **Action**: Regenerate with clarifying instructions
- **Example**: "Scope drift detected - output should focus on GET endpoint only"

### 3. **ESCALATE** (0-49 score, escalation required but present)
- **Meaning**: High-risk action correctly flagged for founder approval
- **Action**: Route to human approval queue (FOP workflow)
- **Example**: "Database migration requires founder approval (FOP present)"

### 4. **BLOCK** (0-49 score, critical violation)
- **Meaning**: Output violates critical constraints or missing required escalation
- **Action**: Reject output, prevent execution
- **Example**: "CRITICAL violation: High-risk database migration without founder approval"

**Severity caps:**
- CRITICAL violation → max score 49 (forces BLOCK if threshold ≥50)
- HIGH violation → max score 79 (forces RETRY if threshold ≥80)

---

## Embedding in a Pipeline

### Pattern 1: Gating (Block Non-Compliant Outputs)

```javascript
import { GovernanceEngine } from '@dealgo/governance-sdk';

const engine = new GovernanceEngine();
const capsule = loadCapsule('./capsule.v1.json');

// LLM generates output
const output = await llm.generate(prompt);

// Evaluate against governance policy
const report = engine.evaluate({ capsule, task, output });

// Gate execution based on verdict
if (report.verdict === 'BLOCK') {
  throw new Error(`Governance violation: ${report.actions[0].reason}`);
}
if (report.verdict === 'ESCALATE') {
  await sendToApprovalQueue(report);
  return; // Wait for human decision
}
if (report.verdict === 'RETRY') {
  return llm.generate(prompt, { instructions: report.actions[0].reason });
}

// ALLOW → proceed
return output;
```

### Pattern 2: Logging (Analysis Mode)

```javascript
const report = engine.evaluate({ capsule, task, output });

// Log for audit/telemetry (don't block)
await logToAuditTrail({
  timestamp: report.evaluatedAt,
  verdict: report.verdict,
  score: report.analysis.score,
  violations: report.violations.map(v => v.code)
});

// Always allow (just monitor)
return output;
```

### Pattern 3: Middleware (HTTP Gateway)

```javascript
app.post('/api/llm/generate', async (req, res) => {
  const output = await llm.generate(req.body.prompt);
  
  const report = engine.evaluate({
    capsule: req.body.capsule,
    task: req.body.task,
    output
  });
  
  res.json({
    output,
    governance: {
      verdict: report.verdict,
      score: report.analysis.score,
      compliant: report.verdict === 'ALLOW'
    }
  });
});
```

---

## Capsule Structure (Policy Definition)

Capsules are **JSON files** defining:

1. **Scope** (`allowedInScope`, `forbiddenInScope`): What task can/cannot do
2. **Required Gates** (`requiredHeading`): Structural requirements (Plan/Action/Risk headers)
3. **Risk Level** (`riskProfile`): LOW/MODERATE/HIGH/CRITICAL (affects escalation rules)
4. **Escalation Rules** (`escalationRequired`, `escalationLanguage`): When to require FOP

**Example:**

```json
{
  "capsule": {
    "riskProfile": "MODERATE",
    "scopeGuardrails": {
      "allowedInScope": ["read operations", "GET endpoints"],
      "forbiddenInScope": ["database writes", "DELETE operations"]
    },
    "escalationRules": {
      "escalationRequired": false,
      "escalationLanguage": ["FOP", "approval", "founder"]
    },
    "requiredHeading": ["Plan", "Action"]
  }
}
```

**Capsules are portable** (work across OpenAI/Claude/Gemini/local models).

---

## ComplianceReport Structure (Output Format)

```json
{
  "verdict": "ALLOW",
  "analysis": {
    "score": 92,
    "confidence": 0.88,
    "dimensions": {
      "drift": { "score": 100, "weight": 0.30 },
      "pressure": { "score": 100, "weight": 0.20 },
      "gates": { "score": 100, "weight": 0.20 },
      "escalation": { "score": 50, "weight": 0.30 }
    }
  },
  "violations": [],
  "actions": [
    {
      "type": "ALLOW",
      "reason": "Output compliant with governance policy",
      "priority": 1
    }
  ],
  "metadata": {
    "evaluatedAt": "2026-02-11T00:00:00.000Z",
    "engineVersion": "1.0.0",
    "capsuleId": "capsule-v1-compact"
  }
}
```

**Storage-ready:** Log to append-only audit ledger for compliance evidence.

---

## Determinism Guarantees

DGP v1.0 is **bit-for-bit deterministic**:

- Same capsule + task + output → **same report every time**
- Reproducible across: vendors, languages, timestamps (via `now()` injection)
- No randomness, no heuristics that drift over time
- **Frozen formulas** (confidence, caps, scoring) never change in v1.0

**Why?** Enables:
- Multi-vendor governance (same policy, different LLMs)
- Audit trail verification (reproduce historical decisions)
- Compliance certification (prove decisions match policy)

---

## Protocol Positioning

**DGP is to AI governance what:**
- **OAuth** is to authentication (standard protocol, vendor-agnostic)
- **OpenAPI** is to API contracts (machine-readable, portable)
- **PCI-DSS** is to payment compliance (certification levels, audit trails)

**Three-artifact standard:**
1. **Specification** (ENGINE_CONTRACT.md) — the RFC
2. **Conformance Suite** (canonical-v1.json) — 8 normative test vectors
3. **Reference Implementation** (GovernanceEngine.js) — proves spec works

---

## Adoption Paths

### Path 1: Standalone Evaluation
- Load capsule, call `evaluate()`, get report
- Use in CI/CD, playgrounds, development

### Path 2: Agent Framework Integration
- Wrap LangChain/LlamaIndex/CrewAI agents
- Evaluate every LLM output before execution

### Path 3: API Gateway Middleware
- Deploy as HTTP middleware
- Centralized governance for all LLM APIs

### Path 4: Enterprise Control Plane
- Policy registry (versioned capsules)
- Enforcement modes (analysis vs block)
- Audit logs + trend dashboards
- Compliance attestations

---

## Versioning

**DGP v1.0 is FROZEN:**
- Formulas, caps, string catalogs never change
- Additive changes only (new optional metadata fields)

**Future versions:**
- v1.1: New validators (tone, bias) with new canonical vectors
- v2.0: Breaking changes (new confidence formula, new capsule schema)

**Migration:**
- Each version has separate canonical vectors (`canonical-v2.json`)
- Engines specify supported protocol version in metadata
- Clients negotiate version like HTTP/1.1 vs HTTP/2

---

## Getting Started

1. **Read the spec**: `governance-sdk/docs/ENGINE_CONTRACT.md`
2. **Run conformance**: `node --test test/contract-compliance.test.js`
3. **Try examples**: `governance-sdk/examples/basic-usage.js`
4. **Load a capsule**: `capsule.v1.compact.json`
5. **Evaluate output**: `engine.evaluate({ capsule, task, output })`

**Badge:** ✅ **DGP v1.0 Conformant**

---

## Where DGP Connects

```
┌────────────────┐
│  LLM Provider  │  (OpenAI, Claude, Gemini, local)
└───────┬────────┘
        │ generates
        ▼
┌────────────────┐
│  Output (text) │  ◄─── DGP evaluates THIS
└───────┬────────┘
        │
        ▼
┌────────────────┐
│ ComplianceReport│  (ALLOW/RETRY/ESCALATE/BLOCK)
└───────┬────────┘
        │
        ▼
┌────────────────┐
│  Application   │  (uses verdict to gate/log/retry)
└────────────────┘
```

**DGP sits BETWEEN generation and execution**, not inside the model.

---

## Support & Contributions

- **GitHub**: [dealgo/dgp-spec](https://github.com/dealgo/dgp-spec)
- **Issues**: Conformance questions, implementation guidance
- **Discussions**: Use cases, integration patterns
- **Implementations**: Submit yours for listing (Python, Go, Rust welcome)

---

**Protocol Status:** Frozen. Boring on purpose. Ready for production.
