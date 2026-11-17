# WindowProof

**Can these time windows all be true at once?**

A standalone GenLayer Intelligent Contract for small handover plans, installation schedules and incident timelines. WindowProof independently interprets written elapsed-time constraints, derives the tight allowable intervals and retains a concrete contradiction when the declarations cannot coexist. Only a schedule satisfying every accepted constraint can become committed.

A plan says installation happens 10–20 minutes after the start and opening happens 5–15 minutes after installation. The opening window is therefore 15–35 minutes after the start. Adding “opening is no later than minute 4” is a contradiction, not an instruction to quietly adjust the plan.

## Mechanism

1. `seal` fixes 2–6 named events, a finite minute horizon and 1–10 source clauses under the caller's namespace. Event 0 is fixed at minute 0.
2. `analyze` executes a native GenLayer leader/validator boundary. Each validator independently interprets every original clause, compares the complete canonical interval result against the leader. Reversed but mathematically equivalent intervals agree. Accepted anchors are the complete original clauses. Missing units, ambiguity or unsupported rules remain UNKNOWN.
3. Deterministic difference-constraint code either produces tight bounds for **every event pair**, plus feasible earliest/latest schedules, or an indexed negative-weight cycle whose sum proves inconsistency. Any accepted unknown clause instead produces REVIEW.
4. `commit_schedule` checks a caller-selected complete schedule against the accepted bounds, source-bound analysis digest, ownership and revision. Commitment is terminal. The model never chooses times or overrides the constraints.

**Canonical Stable Studionet contract:** [`0x7DbC438ec037A1EBE4E00c24dc3c43D0b22c3E7B`](https://explorer-studio.genlayer.com/address/0x7DbC438ec037A1EBE4E00c24dc3c43D0b22c3E7B). [Real transactions and readbacks](EVIDENCE.md).

## Use

Only Stable Studionet: chain **61999**, RPC `https://studio.genlayer.com/api`, exact SDK **genlayer-js@1.1.8**. Source: [contracts/windowproof.py](contracts/windowproof.py), pinned Python runner, no constructor arguments and no payable methods.

```sh
npm ci
npm test
npm run verify
```

`npm run verify` is read-only: it checks deployed source bytes, every recorded receipt, actual calldata, final state and independently recalculated certificates. See [EVIDENCE.md](EVIDENCE.md) for the deployed address, real transaction outcomes and limits.

```js
// Use the SDK examples and supply your own Stable Studionet signer.
await write('seal', ['handover', JSON.stringify(specification)]);
await write('analyze', [`${owner}:handover`, 0]);
// Wait for FINALIZED + SUCCESS, then read get_record at latest-final.
await write('commit_schedule', [id, 1, record.analysis_hash, JSON.stringify(record.proof.earliest)]);
```

[API and state machine](docs/PROTOCOL.md) · [Call example](scripts/example.mjs) · [Input](examples/feasible.json) · [Tests](tests/test_windowproof.py) · [Operating scripts](docs/OPERATIONS.md).

## Why GenLayer belongs here

Written timing rules can express lower bounds, upper bounds, reversed event order or missing units. Ordinary deterministic contracts can verify numeric schedules, but cannot establish that submitted numeric constraints correctly represent the sealed prose. WindowProof makes that interpretation independently verifiable before any schedule can be committed. The exact solver and immutable owner-scoped record remain reusable by other tools without another model call.

## Limits

This analyzes public declarations, not observed clocks, real sensor data, authentic external events or current UTC time. A source author can lie. Independent validators and quotation anchors reduce unsupported interpretation but cannot eliminate correlated model errors. Each clause must express one interval on one event pair; arbitrary calendar rules, uncertain durations and alternative schedules are not silently approximated. Minute-domain boundaries are inclusive. A committed plan does not execute a real-world scheduler or guarantee an event occurs.
