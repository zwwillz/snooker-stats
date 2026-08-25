const sources = [
  ['Stage One/WK1','221af158-c0f2-48cc-94a8-47b45a4a9c2d',72],
  ['Stage One/WK2','130ef3b6-ef10-481f-b01b-541debd7e591',72],
  ['Stage One/WK3','f377387b-3079-457f-8489-6f4629eb051d',48],
  ['Stage Two/WK1','79bcd402-fe9a-4d16-930e-ce8f7eae2599',24],
  ['Stage Two/WK2','24b1a5d3-bfe3-41df-b998-eacb7d83ce24',24],
  ['Stage Three & Final','a9c7a8a2-fc65-4ee5-9f15-752cdc8f2364',13],
];
const db = 'https://rtlvncsmbueatdzqvhbn.supabase.co';
async function json(url, init={}) {
  const res = await fetch(url, init); const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${url}: ${text.slice(0,500)}`);
  return text ? JSON.parse(text) : null;
}
console.log('credentials', JSON.stringify({publicKey:!!process.env.PUBLIC_KEY,serviceKey:!!process.env.SERVICE_KEY,accessToken:!!process.env.ACCESS_TOKEN,dbPassword:!!process.env.DB_PASSWORD}));
const owners = new Map();
console.log('=== WST ===');
for (const [label,id,expected] of sources) {
  const body = await json(`https://tournaments.snooker.web.gc.wstservices.co.uk/v2/${id}`, {headers:{accept:'application/json'}});
  const a = body?.data?.attributes ?? {}; const matches = Array.isArray(a.matches) ? a.matches : [];
  for (const m of matches) owners.set(m.matchID,label);
  console.log(JSON.stringify({label,id,name:a.name,startDate:a.startDate,endDate:a.endDate,matchCount:matches.length,expected,rounds:[...new Set(matches.map(m=>m.round).filter(Boolean))]}));
}
console.log('WST total unique', owners.size);
const key = process.env.SERVICE_KEY || process.env.PUBLIC_KEY;
if (!key) { console.log('NO_DATABASE_KEY_AVAILABLE_IN_GITHUB_ACTIONS'); process.exit(0); }
const headers = {apikey:key,Authorization:`Bearer ${key}`,Accept:'application/json'};
const ids = sources.map(x=>x[1]).join(',');
const events = await json(`${db}/rest/v1/snooker_events?select=id,slug,source_event_id,name_en,name_zh,sponsor_name,status,start_date,end_date,country_zh,city_zh,venue_zh,venue_en,data_ready,expected_match_count,event_type,event_stage,ranking_status,series_id,stage_name_en,stage_name_zh,stage_order&source_name=eq.WST&source_event_id=in.(${ids})&order=start_date.asc`,{headers});
console.log('=== DB EVENTS ==='); console.log(JSON.stringify(events,null,2));
const bySource = new Map(events.map(e=>[e.source_event_id,e]));
for (const [label,sourceId,expected] of sources) {
  const e = bySource.get(sourceId); if (!e) { console.log(JSON.stringify({label,sourceId,error:'EVENT_MISSING'})); continue; }
  const [rounds,matches] = await Promise.all([
    json(`${db}/rest/v1/snooker_rounds?select=id,round_key,label_en,label_zh,sort_order,best_of&event_id=eq.${e.id}&order=sort_order.asc`,{headers}),
    json(`${db}/rest/v1/snooker_matches?select=id,source_match_id,round_id,match_no,player1_id,player2_id,score1,score2,best_of,status,scheduled_at,winner_id,realtime_finalized_at,frames_complete&event_id=eq.${e.id}&order=scheduled_at.asc.nullslast`,{headers}),
  ]);
  const roundById = new Map(rounds.map(r=>[r.id,r]));
  const finals = matches.filter(m=>roundById.get(m.round_id)?.round_key==='final'||/final/i.test(roundById.get(m.round_id)?.label_en||''));
  let frameRows=0; const withFrames=new Set();
  for (let i=0;i<matches.length;i+=25) {
    const batch=matches.slice(i,i+25).map(m=>m.id); if(!batch.length) continue;
    const frames=await json(`${db}/rest/v1/snooker_frames?select=match_id,frame_no&match_id=in.(${batch.join(',')})`,{headers});
    frameRows+=frames.length; for(const f of frames) withFrames.add(f.match_id);
  }
  const sourceIds=new Set(matches.map(m=>m.source_match_id).filter(Boolean));
  const expectedOwned=[...owners].filter(([,owner])=>owner===label).map(([id])=>id);
  const foreign=[...sourceIds].filter(id=>owners.get(id)&&owners.get(id)!==label);
  const missing=expectedOwned.filter(id=>!sourceIds.has(id));
  console.log(JSON.stringify({label,sourceId,eventId:e.id,slug:e.slug,nameZh:e.name_zh,expected,matchCount:matches.length,rounds:rounds.map(r=>({key:r.round_key,labelEn:r.label_en,labelZh:r.label_zh,count:matches.filter(m=>m.round_id===r.id).length})),finals:finals.map(m=>({sourceMatchId:m.source_match_id,score1:m.score1,score2:m.score2,winnerId:m.winner_id,scheduledAt:m.scheduled_at})),matchesWithFrames:withFrames.size,frameRows,foreignCount:foreign.length,foreignSample:foreign.slice(0,10),missingCount:missing.length,missingSample:missing.slice(0,10)}));
}
