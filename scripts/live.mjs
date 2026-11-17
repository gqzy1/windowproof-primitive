import fs from 'node:fs/promises';
import {runtime,need} from './runtime.mjs';
const {people,journal,read,step,checkpoint}=await runtime('windowproof');
const load=async name=>JSON.parse(await fs.readFile(`examples/${name}.json`,'utf8'));
const key=(actor,tag)=>people[actor].address+':'+tag;
const opts=(actor,tag,extra={})=>({readMethod:'get_record',recordId:key(actor,tag),...extra});
async function mainCase(){
 const id=key('owner','handover'),spec=await load('feasible'),o=extra=>opts('owner','handover',extra);
 await step('seal-feasible','owner','seal',['handover',JSON.stringify(spec)],o({check:r=>r.state==='SEALED'&&r.revision===0}));
 const r=await step('analyze-feasible','owner','analyze',[id,0],o({check:r=>r.state==='FEASIBLE'&&JSON.stringify(r.proof.earliest)==='[0,10,15]'&&JSON.stringify(r.proof.latest)==='[0,20,35]'}));
 await step('invalid-schedule','owner','commit_schedule',[id,1,r.analysis_hash,'[0,10,26]'],o({error:'SCHEDULE_CONSTRAINT'}));
 await step('commit-schedule','owner','commit_schedule',[id,1,r.analysis_hash,JSON.stringify(r.proof.earliest)],o({check:r=>r.state==='COMMITTED'&&r.revision===2}));
 await step('duplicate-commit','owner','commit_schedule',[id,2,r.analysis_hash,'[0,10,15]'],o({error:'NOT_FEASIBLE'}));
}
async function conflictCase(){
 const id=key('member','bounded-conflict'),o=extra=>opts('member','bounded-conflict',extra);
 await step('seal-bounded-conflict','member','seal',['bounded-conflict',JSON.stringify(await load('conflict'))],o({check:r=>r.state==='SEALED'}));
 const r=await step('analyze-bounded-conflict','member','analyze',[id,0],o({check:r=>r.state==='CONFLICT'&&r.proof.cycle_sum<0&&r.proof.negative_cycle.length>0}));
 await step('conflict-cannot-commit','member','commit_schedule',[id,1,r.analysis_hash,'[0,10,15]'],o({error:'NOT_FEASIBLE'}));
}
async function unknownCase(){
 const id=key('third','uncertain'),o=extra=>opts('third','uncertain',extra);
 await step('seal-unknown','third','seal',['uncertain',JSON.stringify(await load('unknown'))],o({check:r=>r.state==='SEALED'}));
 const r=await step('analyze-unknown','third','analyze',[id,0],o({check:r=>r.state==='REVIEW'&&r.proof.unknown_clauses.includes(0)}));
 await step('unknown-cannot-commit','third','commit_schedule',[id,1,r.analysis_hash,'[0,10,15]'],o({error:'NOT_FEASIBLE'}));
}
// Distinct owner namespaces are independent; broadcasts and evidence writes remain serialized.
const results=await Promise.allSettled([mainCase(),conflictCase(),unknownCase()]);
for(const r of results)if(r.status==='rejected')throw r.reason;
journal.final_records={handover:await read('get_record',[key('owner','handover')]),conflict:await read('get_record',[key('member','bounded-conflict')]),unknown:await read('get_record',[key('third','uncertain')])};
need(journal.final_records.handover.state==='COMMITTED','Final committed state missing');
journal.acceptance_completed=true;await checkpoint();console.log('WindowProof acceptance complete',journal.address);
