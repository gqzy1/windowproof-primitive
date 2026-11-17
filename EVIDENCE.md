# WindowProof — on-chain evidence

- Network: Stable Studionet, chain **61999**, RPC `https://studio.genlayer.com/api`.
- Contract: [`0x7DbC438ec037A1EBE4E00c24dc3c43D0b22c3E7B`](https://explorer-studio.genlayer.com/address/0x7DbC438ec037A1EBE4E00c24dc3c43D0b22c3E7B).
- Deployment transaction: [`0x48c8f70dc2d399a584c8f10c195bab09639851d83b5728de06813c38c4bc4d5c`](https://explorer-studio.genlayer.com/tx/0x48c8f70dc2d399a584c8f10c195bab09639851d83b5728de06813c38c4bc4d5c).
- Source SHA256: `14434c71b5742110260ca9933046530f16a52f1416fbff375cd5e6a8c7b5d7ce`.
- Exact SDK: `genlayer-js@1.1.8`. Deployed source matches repository bytes.
- Canonical run: **12 FINALIZED transactions: 8 SUCCESS and 4 expected contract rejections.**
- Fresh independent receipt/source/calldata/readback verification: passed, `2026-11-17T18:52:05.429Z`.

Negative cases are finalized failed executions with the exact expected error and unchanged state. They are never counted as SUCCESS. ACCEPTED and a successful leader alone were insufficient. Every positive result also required majority agreement, NORMAL execution mode, full consensus and a matching finalized business-state readback.

## Actual transaction index

| Step | Transaction | Expected result | Observed execution |
| --- | --- | --- | --- |
| deploy | [`0x48c8f70dc2…`](https://explorer-studio.genlayer.com/tx/0x48c8f70dc2d399a584c8f10c195bab09639851d83b5728de06813c38c4bc4d5c) | SUCCESS | FINALIZED / SUCCESS |
| seal-feasible | [`0x3f6a3f2861…`](https://explorer-studio.genlayer.com/tx/0x3f6a3f28614fb0772c869038447be7b9c874f37919ded8cdaac1f317740c07ea) | SUCCESS | FINALIZED / SUCCESS |
| seal-unknown | [`0xa58d83e216…`](https://explorer-studio.genlayer.com/tx/0xa58d83e2165d6e0271f4f917fbae336fb3d65464a90cfc5cda43ff998c090d54) | SUCCESS | FINALIZED / SUCCESS |
| seal-bounded-conflict | [`0x994d5aa8aa…`](https://explorer-studio.genlayer.com/tx/0x994d5aa8aa0fbe5b23b9f926803dc1d4a2b7080989e4484800cff44f7b934176) | SUCCESS | FINALIZED / SUCCESS |
| analyze-feasible | [`0x1ff73638e5…`](https://explorer-studio.genlayer.com/tx/0x1ff73638e5e7d9c3b73c5d9e19b5e58cf07d9237886c4680eda870d6815b7ee4) | SUCCESS | FINALIZED / SUCCESS |
| analyze-unknown | [`0xd7353b4488…`](https://explorer-studio.genlayer.com/tx/0xd7353b44884c1cc5424d1ff2a1003d9437a411dcb077c85e1ae10fcde9a8f8d9) | SUCCESS | FINALIZED / SUCCESS |
| analyze-bounded-conflict | [`0x716409e63d…`](https://explorer-studio.genlayer.com/tx/0x716409e63da0c873b6e28a0c9fe22c689503798a600a11f0fbfd2501b5303ed9) | SUCCESS | FINALIZED / SUCCESS |
| invalid-schedule | [`0x36c1ceedcf…`](https://explorer-studio.genlayer.com/tx/0x36c1ceedcffdee09949d84174c1834ccd25efa1099f40cfd60574af0566f741e) | SCHEDULE_CONSTRAINT | FINALIZED / ERROR |
| unknown-cannot-commit | [`0x5705bec4d0…`](https://explorer-studio.genlayer.com/tx/0x5705bec4d0179f3cd112b7249e3f8d017db9bce1805fabda7c446aae069809db) | NOT_FEASIBLE | FINALIZED / ERROR |
| conflict-cannot-commit | [`0x4e4c4ad0e9…`](https://explorer-studio.genlayer.com/tx/0x4e4c4ad0e98d8b96c12f5ff7d2ba94d149497616ab1d314b1069b2989fab0917) | NOT_FEASIBLE | FINALIZED / ERROR |
| commit-schedule | [`0xe3b88823b8…`](https://explorer-studio.genlayer.com/tx/0xe3b88823b8f1c99238d2038e552a7631699e1a3b86d92e43235930322cfd49d8) | SUCCESS | FINALIZED / SUCCESS |
| duplicate-commit | [`0x5b651a2563…`](https://explorer-studio.genlayer.com/tx/0x5b651a25637a8d268d6fe16193e741eef78086adccb644766a8f9eda465ec2e7) | NOT_FEASIBLE | FINALIZED / ERROR |

## Final state readback

All final records were read again using **latest-final** and independently verified.

- `0x319a96d4b65f49d37733897cdb077f1a1b22f054:handover`: **COMMITTED**, revision 2, schedule `[0, 10, 15]`.
- Tight opening window: `{'hi': 35, 'lo': 15}` minutes relative to event 0.
- Conflict record: **CONFLICT**, negative cycle sum `-11`, edge indices `[7, 5, 8]`.
- Unspecified-timing record: **REVIEW**, unknown clauses `[0]`.

## Evidence files

- `deployment.json`: canonical network, address, transaction and source hash.
- `evidence/live.json`: actual signed intents, hashes, selected real receipts, before/after readbacks and final states.
- `evidence/receipts/`: selected actual RPC fields, including returned votes and leader outputs. Server configuration is omitted.
- `evidence/verification.json`: fresh independent source, receipt, calldata, finality and readback checks.
- `evidence/verified-records.json`: independently fetched final records.
- `evidence/solver-parity.json`: AST identity of unchanged solver functions and their previously tested source.
- `scripts/verify_record.py`: offline proof verifier independent of contract imports.

## Historical source compatibility evidence

Historical attempts are excluded from the canonical acceptance totals. They are not presented as successful native execution. The initial immutable source assumed its extra JSON audit returned a string; its semantic validation failed closed. `evidence/history/revision-1/` retains its exact deployed source and observed receipts. Revision 2 handled JSON objects and completed known-input main workflows, but uncertain cases did not reach majority agreement. `evidence/history/revision-2/` preserves those actual successes and failures.

The canonical validator independently reinterprets the complete original inputs and compares every business decision. Anchors are deterministically fixed to the complete original source text. Canonical JSON text crosses the native boundary. No additional language-audit call is used.

The third historical revision isolated the remaining uncertainty failure to `RULE_SCHEMA` in the leader, before acceptance. Exact native execution traces are retained in `evidence/history/revision-3/failure-diagnostics.json`. The canonical parser normalizes omitted null/empty fields only under explicit UNKNOWN, and omitted unbounded sides only in otherwise valid KNOWN intervals. Missing labels, unknown keys, non-null UNKNOWN endpoints and fully unbounded KNOWN rules still reject. No technical exception becomes a business UNKNOWN.

Historical revision 2 also retains one one-sided time phrase that failed to reach majority. Its separate explicit 0–4 minute correction passed native conflict analysis. This does not prove the original phrase false; interpretation may fail to converge.

## Local verification and limits

11 current parser/state/validator groups passed in `evidence/current-contract-tests.txt`. Unchanged mathematical oracle results remain in `evidence/base-solver-tests.txt`, with solver AST identity verified separately; those successful oracle tests were not repeated.
The solver oracle compares 700 bounded random temporal networks with every legal integer schedule. Current tests also cover explicit UNKNOWN with omitted nulls, missing unbounded sides, malformed KNOWN/UNKNOWN outputs, anchors, permissions, hashes, revisions, cycles and terminal commitment.

GenVM lint and SDK validation passed. A newer-runner advisory is informational; the pinned source passed real Stable Studionet schema compilation and the native transactions above. Inputs are synthetic public declarations; transactions, validators and stored states are real. These checks do not prove immunity to all prompt manipulation, network outages or correlated errors. No real-world event, identity or service fulfillment is asserted. No cash purchase, asset custody or external command execution is involved.
