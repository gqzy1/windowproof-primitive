# Reproducible use and verification

Python 3.12+ and Node.js 22+ are supported. Install with `npm ci`. Local invariants run with `npm test`; these substitute only the host/model and are not live consensus. `genvm-linter==0.11.0` can check the pinned standalone source: `genvm-lint check contracts/windowproof.py --json`. The source runner has an informational newer-runner advisory; it passed both SDK validation and the recorded Stable Studionet compilation.

## Read and verify

`npm run verify` never submits a transaction and does not need a wallet. It re-fetches each recorded receipt, requires finality, successful execution for positive cases and the exact expected rejection for negative cases, validates signer/destination/decoded calldata, checks source byte parity and reads every final record at `latest-final`. The independent Python verifier uses repeated Bellman-Ford to check the tight-bound proof, cycle and schedule hashes without importing the contract.

The included evidence is a point-in-time record. A Studio reset or RPC unavailability can prevent re-verification; never replace that with a simulated success. `evidence/receipts/` contains selected actual RPC fields, not full server node configuration. Complete raw receipt hashes are retained in the live journal. Accepted leader outputs and actual consensus votes are preserved where returned by the RPC.

## Actual calls

```sh
node scripts/example.mjs protocol
node scripts/example.mjs get_record '["OWNER_ADDRESS:handover"]'
```

Use the deployed owner-qualified ID from `evidence/live.json`. For new records, supply your own signed calls through `scripts/example.mjs` and the JSON argument array shown in `PROTOCOL.md`. Write calls require local `STUDIO_PRIVATE_KEY` and `ENABLE_CHAIN_WRITES=61999`. No password or key belongs in a command argument or repository. Call `seal` with the example JSON serialized as its second string argument; call `analyze` at revision 0; after finalized success and readback call `commit_schedule` at revision 1 with the exact stored digest and a complete valid times array serialized as a string.

The example caller journals a hash in ignored `.local/` before polling and does not resend an already recorded successful call. A timeout resumes the same hash. A SUBMITTING entry without hash requires manual transaction-history reconciliation, not automatic retry. A successful example call reports final execution; read the relevant business record separately.

## Deployment and acceptance

`npm run schema` compiles the current source through the Stable Studionet RPC without deploying. `ENABLE_CHAIN_WRITES=61999 npm run live` deliberately performs a complete new deployment/acceptance **only when no live journal already exists**. With a journal present it resumes pending hashes and skips completed operations. Never delete successful evidence to force a rerun.

Live scripts generate dedicated local test signers with restrictive file permissions and attach zero value. They do not access another user's wallet, purchase tokens or transfer assets. The constructor takes no arguments. No alternate network or fallback RPC is permitted. Source modification after a recorded deployment stops the script instead of silently redeploying.

For every positive step the script requires FINALIZED, SUCCESS, majority agreement, NORMAL mode and `leader_only:false`, then reads state. Expected negative steps must finalize with the exact named contract failure and unchanged state. A rejection is never counted as SUCCESS. Undetermined consensus, source mismatch or unexpected state stops the run and retains evidence. Technical/model failure is not business REVIEW.

A fresh clone includes public evidence but never the original private signer keys. Use `npm run verify` in that clone. The live runner requires its original local actors to match the journal and refuses mismatched newly generated keys instead of issuing substitute signatures.
