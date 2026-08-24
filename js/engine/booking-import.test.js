const fs=require('fs');
global.window={}; global.normalizeMembershipTier=(v)=>({flex:'flex_1',partner:'partner_1'}[v]||v||'');
eval(fs.readFileSync('/Users/kolbylandon/fit4life-work/js/engine/booking-import.js','utf8'));
const I=window.bookingImportInternals;
const raw=fs.readFileSync('/Users/kolbylandon/booking-report-sample-2026-08-24.csv','utf8');
const REF={reference:'2026-08-24T12:00:00'};
const P=(t,o)=>window.parseBookingExport(t,Object.assign({},REF,o));
const HDR='Member,Phone,Email,Package,Trainer,Chosen Times,Status,Next Renewal';
let pass=0,fail=0;
const t=(name,got,want)=>{const ok=String(got)===String(want);ok?pass++:fail++;
  console.log((ok?'  PASS  ':'  FAIL  ')+name.padEnd(62)+(ok?'':`\n         got ${got}  want ${want}`));};

console.log('--- row-order tier selection (real file) ---');
const p=P(raw);
t('Gold beats Bronze regardless of row order', p.clients.find(c=>c.email==='lefevrej@byui.edu').tierId,'premium');
t('membership beats a one-off pack',           p.clients.find(c=>c.email==='carpenterd@byui.edu').tierId,'flex_1');
t('all 10 appointments still parse',           p.clients.reduce((n,c)=>n+c.appointments.length,0),10);

console.log('--- expired/cancelled must not define a tier ---');
const dead=`${HDR}\namy,1,amy@byui.edu,Bronze — 1 session / week,T,,Expired,`;
t('expired-only client yields no tier', P(dead).clients[0].tierId||'(none)','(none)');
let d=window.diffBookingImport(P(dead),{profiles:[{id:'amy',email:'amy@byui.edu',membershipTier:'premium'}]});
t('...and no tier change is proposed', d.updated.filter(u=>u.changes.some(c=>c.field==='membershipTier')).length,0);

console.log('--- a failed parse must not mark the roster missing ---');
d=window.diffBookingImport(P('Name,Email\nx,y'),{profiles:[],previousState:{fingerprint:'z',missCounts:{},knownEmails:['a@b.c','d@e.f']}});
t('aborted on unreadable file', d.aborted, true);
t('nobody marked missing',      d.missing.length, 0);

console.log('--- re-importing the same file must not double-count misses ---');
let s1=window.diffBookingImport(P(raw),{profiles:[]}).nextState;
const trunc=raw.split('\n').filter(l=>!/MILLERK/i.test(l)).join('\n');
let dd=window.diffBookingImport(P(trunc),{profiles:[],previousState:s1});
t('one truncated export -> 1 miss', dd.missing[0].consecutiveMisses,1);
let again=window.diffBookingImport(P(trunc),{profiles:[],previousState:dd.nextState});
t('the SAME file again -> still 1', again.missing.length?again.missing[0].consecutiveMisses:1,1);
t('...and not actionable',          again.review.filter(r=>r.kind==='missing_twice').length,0);

console.log('--- duplicate / alternate emails ---');
d=window.diffBookingImport(P(raw),{profiles:[
  {id:'a',email:'x@y.z',bookingEmail:'millerk@byui.edu',membershipTier:'partner_2',sessionsPerWeek:2,bookingStatus:'pending_payment',assignedTrainerName:'Maren Hansen'}]});
t('bookingEmail matches, no duplicate created', d.created.filter(c=>c.client.email==='millerk@byui.edu').length,0);
d=window.diffBookingImport(P(raw),{profiles:[
  {id:'r',email:'millerk@byui.edu'},{id:'dupe',email:'millerk@byui.edu'}]});
t('two profiles on one email are flagged', d.review.filter(r=>r.kind==='duplicate_profiles').length,1);
t('...and neither is silently updated',    d.updated.filter(u=>u.client.email==='millerk@byui.edu').length,0);

console.log('--- every upstream field is compared ---');
d=window.diffBookingImport(P(raw),{profiles:[{id:'k',email:'millerk@byui.edu',membershipTier:'partner_2',
  name:'Kurt Miller',sessionsPerWeek:1,assignedTrainerName:'Someone Else',phone:'',bookingStatus:''}]});
t('trainer/sessions/status changes detected',
  (d.updated[0]?d.updated[0].changes.map(c=>c.field).sort().join(','):'(none)'),
  'assignedTrainerName,bookingStatus,phone,sessionsPerWeek');

console.log('--- clock / date hardening ---');
t('11:30 PM slot never emits hour 24', P(`${HDR}\nn,1,n@b.c,Bronze — 1 session / week,T,Monday 11:30 PM,Active,`).clients[0].recurring[0].endTime,'00:30');
const mid=P(`${HDR}\nn,1,n@b.c,Bronze — 1 session / week,T,"Fri, Jul 24 11:30 PM–12:30 AM · Consult",Active,`).clients[0].appointments[0];
t('midnight crossing keeps the real end time', mid.endTime,'00:30');
t('...and is not marked assumed',              mid.endTimeAssumed,false);
t('weekday anchors the year (Fri Jul 24)', I.parseChosenTimes('Fri, Jul 24 1:00 PM–2:00 PM · Session',{reference:'2027-03-01'}).appointments[0].date,'2026-07-24');
t('stale import still dates the real file right',
  P(raw,{reference:'2027-03-01T12:00:00'}).clients.reduce((n,c)=>n+c.appointments.filter(a=>a.date.startsWith('2026')).length,0),10);

console.log('--- package parsing hardening ---');
t('prototype key is not a tier', I.parsePackage('constructor').tierId||'(none)','(none)');
t('prototype key is unmapped',   I.parsePackage('constructor').unmapped,true);
t('double space still resolves', I.parsePackage('Single  Session').tierId,'payg_single');
t('decorated pack name resolves',I.parsePackage('Kickstart bundle - Aug').tierId,'payg_kickstart');
t('unknown plan refused',        I.parsePackage('Platinum — 5 sessions / week').tierId||'(none)','(none)');

console.log('--- appointment dedup keeps distinct bookings ---');
const two=`${HDR}
e,1,e@b.c,Bronze — 1 session / week,A,"Wed, Aug 12 3:00 PM–4:00 PM · Session",Active,
e,1,e@b.c,Gold — 3 sessions / week,B,"Wed, Aug 12 3:00 PM–3:30 PM · Session",Active,`;
t('same start, different end -> both kept', P(two).clients[0].appointments.length,2);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
