import fs from 'node:fs/promises';
import {createAccount} from 'genlayer-js';
import {TransactionHashVariant} from 'genlayer-js/types';
import {client,network,load,save,sha,receipt,validateReceipt,validateBinding,selected,need} from './runtime.mjs';
const [method='protocol',encoded='[]']=process.argv.slice(2);
const args=JSON.parse(encoded);need(Array.isArray(args),'Arguments must be a JSON array');
const d=await load('deployment.json');need(d?.chain_id===61999,'Stable deployment required');
const views=['protocol', 'get_record', 'list_records'];
if(views.includes(method)){
 const c=client();await network(c);
 console.log(await c.readContract({address:d.contract,functionName:method,args,transactionHashVariant:TransactionHashVariant.LATEST_FINAL}));
}else{
 need(process.env.ENABLE_CHAIN_WRITES==='61999','Explicit ENABLE_CHAIN_WRITES=61999 required');
 const key=process.env.STUDIO_PRIVATE_KEY;need(/^0x[0-9a-fA-F]{64}$/.test(key??''),'Set a local STUDIO_PRIVATE_KEY; never commit it');
 const c=client(key);await network(c);need(sha(await c.getContractCode(d.contract))===d.source_sha256,'Deployed source mismatch');
 await fs.mkdir('.local',{recursive:true,mode:0o700});
 const path='.local/example-'+sha(JSON.stringify({method,args})).slice(0,24)+'.json';
 let entry=await load(path);
 if(entry?.verified){console.log('Already verified',entry.hash);process.exit(0)}
 if(!entry){
  entry={method,args,signer:createAccount(key).address.toLowerCase(),stage:'SUBMITTING'};await save(path,entry);
  entry.hash=await c.writeContract({address:d.contract,functionName:method,args,value:0n,leaderOnly:false});entry.stage='PENDING';await save(path,entry);
 }
 need(entry.hash,'Unknown broadcast outcome; reconcile original signer before retry');
 const r=await receipt(c,entry.hash);entry.receipt=selected(r);await save(path,entry);
 validateReceipt(r,entry.hash);validateBinding(r,entry,d.contract);entry.verified=true;await save(path,entry);
 console.log('FINALIZED + SUCCESS',entry.hash,'Read the relevant record at latest-final.');
}
