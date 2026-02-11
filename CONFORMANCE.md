# DGP v1.0 Conformance

**DeAlgo Governance Protocol (DGP) v1.0** is a deterministic compliance protocol for evaluating LLM outputs against portable governance policies. Implementations claim conformance by passing **8 normative canonical vectors** with **bit-for-bit accuracy**.

---

## What "DGP v1.0 Conformant" Means

A conformant implementation:

✅ **Matches all 8 canonical vectors exactly** (`test/vectors/canonical-v1.json`)  
✅ **Preserves deterministic ordering** (violations, actions, scores)  
✅ **Applies frozen formulas** (confidence, caps, normalizations)  
✅ **Uses frozen string catalogs** (ViolationMessageV1, ActionReasonV1)  
✅ **Supports time injection** (`now()` parameter for reproducible timestamps)  
✅ **Follows rounding rules** (`Math.round()` for final scores)  

**Non-conformance** = any deviation in:
- Score values (±1 point tolerance NOT allowed)
- Confidence values (must match to 2 decimal places: 0.88)
- Violation/action ordering
- String content (exact frozen messages)
- Metadata structure

---

## Validation Command

### Reference Implementation (JavaScript/Node.js)

Run canonical vectors against the reference engine:

```bash
cd governance-sdk
node --test test/contract-compliance.test.js
```

**Expected output:**
```
🎯 Running 8 normative contract compliance tests...
✔ v1-01-perfect-compliance
✔ v1-02-high-risk-escalation
✔ v1-03-critical-violation-cap
✔ v1-04-high-violation-cap
✔ v1-05-indeterminate-escalation
✔ v1-06-baseline-delta-calculation
✔ v1-07-rounding-boundary
✔ v1-08-custom-weights
ℹ tests 45
ℹ pass 45
ℹ fail 0
```

**8/8 passing = conformant ✅**

---

## Other Languages (Python, Go, Rust, etc.)

To claim conformance in another language:

1. **Load canonical vectors**: Parse `test/vectors/canonical-v1.json`
2. **For each vector**:
   - Extract `capsule`, `task`, `output`, `baseline` (if present)
   - Call your implementation: `evaluate(capsule, task, output, baseline)`
   - Compare your `ComplianceReport` JSON against `expected` (deep equality)
3. **All 8 must match exactly**:
   - Same scores (no ±1 tolerance)
   - Same confidence values (0.88 not 0.875 rounded differently)
   - Same violation/action ordering
   - Same frozen strings

**Example (pseudocode):**

```python
import json
from your_dgp_library import GovernanceEngine

# Load normative vectors
with open('canonical-v1.json') as f:
    suite = json.load(f)

engine = GovernanceEngine(now=lambda: "2026-02-11T00:00:00.000Z", engine_version="1.0.0")

for vector in suite['vectors']:
    result = engine.evaluate(
        capsule=vector['capsule'],
        task=vector['task'],
        output=vector['output'],
        baseline=vector.get('baseline')
    )
    
    # Deep equality check
    assert result == vector['expected'], f"Vector {vector['id']} failed"

print("✅ DGP v1.0 Conformant: 8/8 vectors passing")
```

---

## Determinism Requirements

Conformant implementations MUST:

### 1. Stable Ordering
- Violations ordered by: `severity DESC`, `dimension ASC`, `code ASC`
- Actions ordered by: verdict priority, then insertion order

### 2. Frozen Formulas
- **Verdict confidence**: `heuristic / (structural + heuristic)` capped at 1.0
- **Escalation confidence**: State-based (ok=true→1.0, ok=null→0.5, ok=false→0.0)
- **Score caps**: CRITICAL→49, HIGH→79
- **Normalization**: RetryPressure uses `min(uncertaintyCount×0.1 + todoCount×0.2, 1.0)`

### 3. Frozen String Catalogs
Exact violation messages and action reasons per `ENGINE_CONTRACT.md` Appendix A:
- `DRIFT_FORBIDDEN_KEYWORD`: "Output contains forbidden term: {keyword} (count: {count})"
- `BLOCK_CRITICAL_FOP`: "CRITICAL violation: High-risk database migration without founder approval"
- `RETRY_SCOPE_DRIFT`: "Scope drift detected - output should focus on GET endpoint only"

### 4. Time Injection
Accept `now()` parameter (function returning ISO 8601 string) to ensure reproducible `evaluatedAt` timestamps.

### 5. Rounding Rule
Final scores use `Math.round()` (half-up to nearest integer). Example: 79.5 → 80.

---

## Conformance Badge

Once validated, display:

```markdown
✅ **DGP v1.0 Conformant**
```

Or use in CI:

```yaml
- name: DGP Conformance Check
  run: |
    node --test test/contract-compliance.test.js
    if [ $? -eq 0 ]; then echo "✅ DGP v1.0 Conformant"; else exit 1; fi
```

---

## Version Stability Guarantee

DGP v1.0 is **FROZEN**:
- No formula changes (confidence, caps, scoring)
- No string catalog changes (violation/action messages)
- No behavioral changes (ordering, rounding)

**Additive changes only** (new optional fields in ComplianceReport metadata).

For new behavior: **DGP v1.1+** with new canonical vectors (`canonical-v1_1.json`) and migration guide.

---

## Non-Conformance (What Doesn't Count)

❌ **"Close enough" scores** (79 vs 80 = fail)  
❌ **Different string phrasing** ("Database migration risky" vs frozen message)  
❌ **Custom confidence formulas** (state-based is mandatory)  
❌ **Skipping vectors** (must pass all 8, not 7/8)  
❌ **Approximate matching** (all fields must match exactly)

**Why strict?** DGP is a **wire protocol** for governance decisions. Like OAuth tokens or OpenAPI schemas, bit-for-bit reproducibility ensures multi-vendor interoperability and audit trail integrity.

---

## Support

- **Spec**: `governance-sdk/docs/ENGINE_CONTRACT.md`
- **Vectors**: `governance-sdk/test/vectors/canonical-v1.json`
- **Reference SDK**: `governance-sdk/src/core/GovernanceEngine.js`
- **Issues**: Submit conformance questions to [repo](https://github.com/dealgo/dgp-spec)

---

**Standard Positioning:**  
*DGP is to AI governance what OAuth is to authentication, OpenAPI to API contracts, and PCI-DSS to payment compliance.*
