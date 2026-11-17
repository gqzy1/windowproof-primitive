"""Offline certificate verification without importing the contract or GenLayer host."""
import hashlib
import json
import sys

def sha(v):return hashlib.sha256(json.dumps(v,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()
def verify(r):
    data=r['input'];n=len(data['events'])
    assert r['input_hash']==sha({'version':'windowproof-1','input':data})
    if r['state']=='SEALED':
        assert r['revision']==0 and 'accepted' not in r and 'proof' not in r;return
    accepted,proof=r['accepted'],r['proof']
    assert r['analysis_hash']==sha({'version':'windowproof-1','id':r['id'],'input_hash':r['input_hash'],'accepted':accepted,'proof':proof})
    unknown=[];edges=[]
    for i in range(1,n):edges.extend([{'from':0,'to':i,'max':data['horizon'],'clause':-1,'kind':'HORIZON'},{'from':i,'to':0,'max':0,'clause':-1,'kind':'NONNEGATIVE'}])
    assert len(accepted['rules'])==len(data['clauses'])
    for i,rule in enumerate(accepted['rules']):
        if rule['status']=='UNKNOWN':
            unknown.append(i);assert all(rule[k] is None for k in ['a','b','lo','hi']) and rule['quote']=='';continue
        assert rule['status']=='KNOWN' and rule['quote'] == data['clauses'][i]
        assert 0<=rule['a']<rule['b']<n
        if rule['hi'] is not None:edges.append({'from':rule['a'],'to':rule['b'],'max':rule['hi'],'clause':i,'kind':'UPPER'})
        if rule['lo'] is not None:edges.append({'from':rule['b'],'to':rule['a'],'max':-rule['lo'],'clause':i,'kind':'LOWER'})
    if unknown:
        assert proof=={'status':'REVIEW','unknown_clauses':unknown} and r['state']=='REVIEW';return
    assert proof['edges']==edges
    if proof['status']=='CONFLICT':
        cycle=[edges[i] for i in proof['negative_cycle']];assert cycle
        assert all(cycle[i]['to']==cycle[(i+1)%len(cycle)]['from'] for i in range(len(cycle)))
        assert sum(e['max'] for e in cycle)==proof['cycle_sum']<0 and r['state']=='CONFLICT';return
    assert proof['status']=='FEASIBLE'
    distances=[]
    # An independent repeated Bellman-Ford oracle checks all claimed tight bounds.
    for source in range(n):
        d=[10**18]*n;d[source]=0
        for _ in range(n-1):
            for e in edges:d[e['to']]=min(d[e['to']],d[e['from']]+e['max'])
        assert all(d[e['to']]<=d[e['from']]+e['max'] for e in edges);distances.append(d)
    assert proof['tight_intervals']==[[{'lo':-distances[b][a],'hi':distances[a][b]} for b in range(n)] for a in range(n)]
    assert proof['earliest']==[-distances[i][0] for i in range(n)] and proof['latest']==distances[0]
    def valid(times):
        assert len(times)==n and times[0]==0 and all(type(t) is int and 0<=t<=data['horizon'] for t in times)
        assert all(times[e['to']]-times[e['from']]<=e['max'] for e in edges)
    valid(proof['earliest']);valid(proof['latest'])
    if r['state']=='COMMITTED':
        valid(r['schedule']);assert r['schedule_hash']==sha({'analysis_hash':r['analysis_hash'],'times':r['schedule']})
    else:assert r['state']=='FEASIBLE'

if __name__=='__main__':
    records=json.load(open(sys.argv[1]))
    for record in records.values():verify(record)
    print('Independent interval, cycle, schedule and commitment verification passed for',len(records),'records.')
