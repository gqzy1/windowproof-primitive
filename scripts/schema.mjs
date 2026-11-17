import fs from 'node:fs/promises';
import {client,network,sha,save,RPC,CHAIN} from './runtime.mjs';
const c=client();await network(c);
const source=await fs.readFile('contracts/windowproof.py');
const schema=await c.getContractSchemaForCode(source);
await save('evidence/schema.json',{kind:'read-only RPC schema compilation',chain_id:CHAIN,rpc:RPC,source_sha256:sha(source),schema});
console.log('Stable Studionet schema compiled; no transaction submitted.');
