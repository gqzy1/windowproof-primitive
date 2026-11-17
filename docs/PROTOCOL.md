# WindowProof protocol

## Input

Exact JSON keys: `title`, `events`, `horizon`, `clauses`. The title is 3–120 characters, events are 2–6 distinct case-insensitive names of 1–50 characters, horizon is an integer from 1 through 1,000,000 minutes and there are 1–10 clauses of 10–800 characters. No hidden additional properties or duplicate JSON keys are accepted. JSON is bounded; text must encode as valid UTF-8 and exclude unsupported control characters.

Event 0 is the reference origin; all event times must be integers in `[0,horizon]`, and time 0 is fixed at zero. These are explicit protocol assumptions, not claims inferred from the source.

## Consensus and equivalence

Each clause independently becomes a KNOWN interval `lo ≤ t[b]−t[a] ≤ hi` or UNKNOWN. One side may be unbounded (`null` or an omitted bound field), but both cannot be unbounded. Endpoints must be different events. Each finite bound is an exact integer minute in `[-1000000,1000000]`. Known excerpts must occur literally in their own clause. An explicit UNKNOWN may omit null-valued endpoint/bound fields and its empty quote; these normalize to the full canonical null/empty shape. It may not carry non-null endpoints or bounds. Missing status, unknown keys, and malformed KNOWN objects still fail rather than becoming UNKNOWN.

Intervals are canonicalized to `a<b`: reverse direction negates and exchanges upper/lower bounds. Independent interpretations must agree on the complete ordered sequence of status, endpoints and bounds. Model excerpts must occur in their own clause; accepted anchors are deterministically replaced by the entire original clause. Each independent interpretation reads that complete source, and all decision fields must match. The nondeterministic return is canonical JSON text, avoiding cross-sandbox container-type differences. Schema-only checking is insufficient and is not used as consensus.

Ambiguity is an accepted business outcome; malformed output, model exceptions, invalid anchors and disagreement abort before storage mutation. They do not become UNKNOWN or a partially trusted certificate. Contradictory but explicit bounds remain KNOWN so the deterministic solver can expose the conflict.

The contract calls `gl.vm.run_nondet_unsafe` with a real independent validator. The network supplies Optimistic Democracy, validator selection, voting, leader rotations, appeals and finality. The application does not synthesize those events or substitute local mocks.

## Exact solver

An upper bound creates edge `a→b` with weight `hi`; a lower bound creates `b→a` with weight `−lo`. Horizon and nonnegative edges bind each event to the origin. An edge means `t[to] ≤ t[from]+weight`.

Bellman-Ford detects a negative cycle. The stored witness gives edge indices, matching endpoints and a strictly negative sum, proving the closed chain of inequalities cannot hold. Clause indices and edge kinds identify the conflicting declarations or domain assumptions. This is a concrete contradiction, not necessarily a minimum-cardinality explanation.

When consistent, Floyd-Warshall computes every tight upper bound `D[a][b]`. The exact attainable interval for `t[b]−t[a]` is `[-D[b][a],D[a][b]]`. Earliest times are `−D[i][0]`; latest times are `D[0][i]`. Both full vectors are checked against all original numeric edges. Finite origin bounds ensure connectivity and bounded results. Integer weights make the interval extrema attainable in this integer-minute model.

## State and methods

| Method | Arguments in order | Rules |
| --- | --- | --- |
| `protocol` | none | Public JSON string with version, limits and interpretation rules |
| `get_record` | `record_id:string` | Public JSON string; empty string if absent |
| `list_records` | `owner:string` | Owner's created record IDs, maximum 24 |
| `seal` | `tag:string,payload:string` | Caller-owned ID `<lowercase-address>:<tag>`; immutable input; exact input replay is idempotent |
| `analyze` | `record_id:string,expected_revision:int` | Owner only; SEALED; produces FEASIBLE, CONFLICT or REVIEW |
| `commit_schedule` | `record_id:string,expected_revision:int,analysis_hash:string,times_json:string` | Owner only; FEASIBLE; exact accepted digest; complete valid schedule |

SEALED starts at revision 0. Analysis sets revision 1. Successful commitment sets revision 2 and state COMMITTED. CONFLICT and REVIEW cannot commit or be reassessed; corrections create a new tag. COMMITTED cannot change. Every write after seal checks exact revision. Tags are 3–32 lowercase letters, digits or hyphens. Different input at an existing ID is rejected.

The analysis hash commits to protocol, ID, immutable input hash, accepted interpretations and entire proof. Commitment recomputes the proof and checks every schedule edge before storing the schedule and its digest. A failed call leaves the record untouched. Ownership is the actual transaction sender, not a caller-supplied address. There is no administrator override, transfer, token, external scheduler mutation or delegated signature.
