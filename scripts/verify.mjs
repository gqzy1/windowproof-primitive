import fs from 'node:fs/promises';
import {client,network,sha,selected,validateReceipt,validateBinding,load,need,save} from './runtime.mjs';
import {TransactionHashVariant} from 'genlayer-js/types';
import {execFileSync} from 'node:child_process';
const deployment=await load('deployment.json'),journal=await load('evidence/live.json');
need(deployment?.chain_id===61999&&journal?.acceptance_completed,'Completed Stable Studionet run required');
const c=client();await network(c);
async function rpcRead(fn){
 for(let attempt=0;;attempt++){
  try{return await fn()}catch(e){if(attempt>=4)throw e;await new Promise(resolve=>setTimeout(resolve,5000))}
 }
}
const sourceFile=(await fs.readdir('contracts')).find(f=>f.endsWith('.py'));
const source=await fs.readFile('contracts/'+sourceFile);
need(sha(source)===deployment.source_sha256,'Local source hash differs');
need(sha(await rpcRead(()=>c.getContractCode(deployment.contract)))===deployment.source_sha256,'Deployed code differs');
const transactions=[];
for(const entry of journal.transactions){
 const r=await rpcRead(()=>c.getTransaction({hash:entry.hash}));validateReceipt(r,entry.hash,entry.expected_success);
 need(r.from_address.toLowerCase()===entry.signer,'Signer differs');
 if(entry.kind==='write')validateBinding(r,entry,deployment.contract);
 if(!entry.expected_success)need(JSON.stringify(r).includes(entry.expected_error),'Expected error absent');
 const saved=await load('evidence/receipts/'+entry.name+'.json');
 need(JSON.stringify(selected(r))===JSON.stringify(saved),'Saved critical receipt fields differ from fresh RPC');
 transactions.push({name:entry.name,hash:entry.hash,status:'FINALIZED',execution:r.consensus_data.leader_receipt.filter(x=>x.mode==='leader').at(-1).execution_result,expected_success:entry.expected_success});
}
const unsuccessful=[];
for(const entry of journal.unsuccessful_attempts??[]){
 const r=await rpcRead(()=>c.getTransaction({hash:entry.hash}));
 need(r.hash===entry.hash && r.from_address.toLowerCase()===entry.signer,'Unsuccessful attempt identity differs');
 validateBinding(r,entry,deployment.contract);
 need(r.result!==6,'Previously unaccepted attempt unexpectedly reached majority agreement; reconcile state');
 unsuccessful.push({name:entry.name,hash:entry.hash,status:r.statusName,result:r.result});
}
const getter=sourceFile.startsWith('window')?'get_record':'get_agenda';
const records={};
for(const [name,expected] of Object.entries(journal.final_records)){
 const raw=await rpcRead(()=>c.readContract({address:deployment.contract,functionName:getter,args:[expected.id],transactionHashVariant:TransactionHashVariant.LATEST_FINAL}));
 const actual=JSON.parse(raw);need(JSON.stringify(actual)===JSON.stringify(expected),'Final readback differs');records[name]=actual;
}
await save('evidence/verified-records.json',records);
const proof=execFileSync('python3',['scripts/verify_record.py','evidence/verified-records.json'],{encoding:'utf8'}).trim();
await save('evidence/verification.json',{chain_id:61999,rpc:deployment.rpc,contract:deployment.contract,source_sha256:deployment.source_sha256,source_byte_parity:true,variant:'latest-final',transactions,unsuccessful_attempts:unsuccessful,records:Object.keys(records),proof_verification:proof,verified_at:new Date().toISOString()});
console.log('Fresh receipt/source/readback verification passed;',transactions.length,'transactions.');
