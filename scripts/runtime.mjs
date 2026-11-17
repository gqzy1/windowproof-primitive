import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createAccount,createClient,generatePrivateKey,abi} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {TransactionHashVariant} from 'genlayer-js/types';
export const RPC='https://studio.genlayer.com/api';
export const CHAIN=61999;
export const stringify=v=>JSON.stringify(v,(_,x)=>typeof x==='bigint'?x.toString():x,2)+'\n';
export const sha=v=>createHash('sha256').update(v).digest('hex');
export function need(v,m){if(!v)throw Error(m)}
export async function load(path,otherwise=null){try{return JSON.parse(await fs.readFile(path,'utf8'))}catch(e){if(e.code==='ENOENT')return otherwise;throw e}}
export async function save(path,value){await fs.writeFile(path+'.tmp',stringify(value));await fs.rename(path+'.tmp',path)}
export function client(key){return createClient({chain:studionet,endpoint:RPC,...key?{account:createAccount(key)}:{}})}
export async function network(c){need(studionet.id===CHAIN && await c.getChainId()===CHAIN,'Stable Studionet 61999 required')}
export async function actors(){
 await fs.mkdir('.local',{recursive:true,mode:0o700});
 let keys=await load('.local/actors.json');
 if(!keys){keys=Object.fromEntries(['owner','member','third','outsider'].map(name=>[name,generatePrivateKey()]));await fs.writeFile('.local/actors.json',stringify(keys),{mode:0o600,flag:'wx'})}
 return Object.fromEntries(Object.entries(keys).map(([name,key])=>[name,{key,address:createAccount(key).address.toLowerCase(),client:client(key)}]));
}
export function selected(r){
 const keys=['hash','from_address','to_address','status','statusName','result','resultName','leader_only','execution_mode','value','txExecutionResultName','txDataDecoded'];
 const result=Object.fromEntries(keys.filter(k=>r[k]!==undefined).map(k=>[k,r[k]]));
 result.data={...r.data};delete result.data.contract_code;
 if(r.consensus_data){
  const raw=r.consensus_data.leader_receipt;
  const receipts=Array.isArray(raw)?raw:raw?[raw]:[];
  result.consensus_data={votes:r.consensus_data.votes,leader_receipt:receipts.map(x=>Object.fromEntries(['mode','vote','execution_result','error','result','eq_outputs'].filter(k=>x[k]!==undefined).map(k=>[k,x[k]])))};
 }
 return result;
}
export function resultOf(r){
 const receipts=r.consensus_data?.leader_receipt;
 const leader=Array.isArray(receipts)?receipts.filter(x=>x.mode==='leader').at(-1):receipts;
 return leader?.execution_result ?? r.txExecutionResultName;
}
export function validateReceipt(r,hash,expectSuccess=true){
 need((r.statusName??r.status)==='FINALIZED','Transaction is not FINALIZED');
 need((r.hash??r.txId)?.toLowerCase()===hash.toLowerCase(),'Receipt hash mismatch');
 need(r.result===6||r.resultName==='MAJORITY_AGREE','Missing majority agreement');
 need(r.leader_only===false&&r.execution_mode==='NORMAL','Full consensus not established');
 need(expectSuccess?resultOf(r)==='SUCCESS':resultOf(r)!=='SUCCESS'&&typeof resultOf(r)==='string','Unexpected execution result');
}
export function callOf(r){
 const data=r.data?.calldata;
 const encoded=typeof data==='string'?data:data?.base64;
 need(typeof encoded==='string','Missing receipt calldata');
 const value=abi.calldata.decode(Buffer.from(encoded,'base64'));
 return value instanceof Map?Object.fromEntries(value):value;
}
function canonical(v){
 if(typeof v==='bigint')return v.toString();
 if(v instanceof Map)v=Object.fromEntries(v);
 if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';
 if(v!==null&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
 return JSON.stringify(v);
}
export function validateBinding(r,entry,address){
 need(r.from_address?.toLowerCase()===entry.signer,'Wrong transaction signer');
 need(r.to_address?.toLowerCase()===address.toLowerCase(),'Wrong contract');
 const call=callOf(r);need(call.method===entry.method&&canonical(call.args)===canonical(entry.args),'Wrong method or arguments');
}
export async function receipt(c,hash,limit=600000){
 const start=Date.now();let last='',transportFailures=0;
 while(Date.now()-start<limit){
  let r;
  try{r=await c.getTransaction({hash});transportFailures=0}
  catch(e){
   if(++transportFailures>5)throw e;
   console.log('Transient RPC read failure; retaining original hash',hash);
   await new Promise(resolve=>setTimeout(resolve,5000));continue;
  }
  const status=r.statusName??r.status;
  if(status!==last){console.log(hash,status);last=status}
  if(status==='FINALIZED')return r;
  if(['CANCELED','UNDETERMINED','LEADER_TIMEOUT','VALIDATORS_TIMEOUT'].includes(status))throw Error(`Non-final successful outcome: ${status}; retained ${hash}`);
  await new Promise(resolve=>setTimeout(resolve,3000));
 }
 throw Error(`Polling timeout; resume hash ${hash}, never resubmit`);
}
export async function runtime(contractName){
 need(process.env.ENABLE_CHAIN_WRITES==='61999','ENABLE_CHAIN_WRITES=61999 required');
 await fs.mkdir('evidence/receipts',{recursive:true});
 const people=await actors();await network(people.owner.client);
 const source=await fs.readFile(`contracts/${contractName}.py`);const sourceHash=sha(source);
 let journal=await load('evidence/live.json',{chain_id:CHAIN,rpc:RPC,sdk:'genlayer-js@1.1.8',source_sha256:sourceHash,actors:Object.fromEntries(Object.entries(people).map(([k,a])=>[k,a.address])),transactions:[],readbacks:{}});
 need(journal.source_sha256===sourceHash,'Source changed since recorded run');
 need(Object.entries(people).every(([name,a])=>journal.actors[name]===a.address),'Original local signer keys do not match this journal; use read-only verification instead');
 let writes=Promise.resolve(),submissions=Promise.resolve();
 const checkpoint=()=>{const snapshot=structuredClone(journal);writes=writes.then(()=>save('evidence/live.json',snapshot));return writes};
 const submitOnce=fn=>{const task=submissions.then(fn);submissions=task.then(()=>{},()=>{});return task};
 let deployed=journal.transactions.find(x=>x.name==='deploy');
 if(!deployed){
  deployed={name:'deploy',kind:'deploy',signer:people.owner.address,expected_success:true,stage:'SUBMITTING'};journal.transactions.push(deployed);await checkpoint();
  deployed.hash=await people.owner.client.deployContract({code:source,args:[],leaderOnly:false});deployed.stage='PENDING';await checkpoint();
 }
 need(deployed.hash,'Deployment broadcast outcome unknown; reconcile signer history');
 if(deployed.stage!=='VERIFIED'){
  const r=await receipt(people.owner.client,deployed.hash);await fs.mkdir('.local/raw-receipts',{recursive:true});await fs.writeFile('.local/raw-receipts/deploy.json',stringify(r));
  validateReceipt(r,deployed.hash);need(r.from_address.toLowerCase()===people.owner.address,'Deployment signer mismatch');
  journal.address=r.data?.contract_address??r.to_address;
  const code=await people.owner.client.getContractCode(journal.address);need(sha(code)===sourceHash,'Deployed source mismatch');
  deployed.receipt=selected(r);deployed.raw_receipt_sha256=sha(stringify(r));deployed.stage='VERIFIED';
  await save('evidence/receipts/deploy.json',deployed.receipt);await checkpoint();
 }
 const address=journal.address;
 await save('deployment.json',{chain_id:CHAIN,rpc:RPC,sdk:'genlayer-js@1.1.8',contract:address,deployment_transaction:deployed.hash,source_sha256:sourceHash});
 const read=async(method,args=[])=>{
  for(let attempt=0;;attempt++){
   try{
    const v=await people.owner.client.readContract({address,functionName:method,args,transactionHashVariant:TransactionHashVariant.LATEST_FINAL});
    return v===''?null:JSON.parse(v);
   }catch(e){if(attempt>=4)throw e;await new Promise(resolve=>setTimeout(resolve,5000))}
  }
 };
 async function step(name,actor,method,args,{error=null,readMethod=null,recordId=null,check=null}={}){
  let entry=journal.transactions.find(x=>x.name===name);
  if(entry?.stage==='VERIFIED')return entry.readback??null;
  if(!entry){
   const before=readMethod?await read(readMethod,[recordId]):null;
   entry={name,kind:'write',signer:people[actor].address,method,args,expected_success:error===null,expected_error:error,stage:'SUBMITTING',before};journal.transactions.push(entry);await checkpoint();
   entry.hash=await submitOnce(()=>people[actor].client.writeContract({address,functionName:method,args,value:0n,leaderOnly:false}));entry.stage='PENDING';await checkpoint();
  }
  need(entry.hash,'Broadcast outcome unknown; reconcile original signer before retry');
  const r=await receipt(people[actor].client,entry.hash);
  await fs.writeFile(`.local/raw-receipts/${name}.json`,stringify(r));
  entry.receipt=selected(r);entry.raw_receipt_sha256=sha(stringify(r));await save(`evidence/receipts/${name}.json`,entry.receipt);await checkpoint();
  validateReceipt(r,entry.hash,!error);validateBinding(r,entry,address);
  if(error)need(stringify(r).includes(error),`Missing expected failure ${error}`);
  const after=readMethod?await read(readMethod,[recordId]):null;
  if(error)need(canonical(after)===canonical(entry.before),'Rejected call changed state');
  if(check)need(check(after),'Unexpected finalized business state');
  entry.readback=after;entry.stage='VERIFIED';journal.readbacks[name]=after;await checkpoint();return after;
 }
 return {people,journal,address,read,step,checkpoint};
}
