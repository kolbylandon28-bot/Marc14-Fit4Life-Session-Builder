/* Tests for client ownership and the safety-exception grant.  Run: node js/app/governance.test.js
   These functions live in files full of DOM and Supabase globals, so each is lifted out by
   name and run against stubs rather than loading the whole app. */
const fs=require("fs"),path=require("path"),R=path.resolve(__dirname,"..","..")+path.sep;
function grab(file,name){
  const src=fs.readFileSync(R+file,"utf8");
  const start=src.indexOf("function "+name+"(");
  if(start<0) throw new Error("not found: "+name);
  let depth=0,i=src.indexOf("{",start);
  for(let j=i;j<src.length;j++){ if(src[j]==="{")depth++; else if(src[j]==="}"){depth--; if(!depth)return src.slice(start,j+1);} }
  throw new Error("unbalanced "+name);
}
let store=[],identity={id:"",role:"",displayName:"",email:""},selectValue="";
const env={
  loadProfiles:()=>JSON.parse(JSON.stringify(store)),
  writeProfiles:(p)=>{store=JSON.parse(JSON.stringify(p));return true;},
  currentAccountIdentity:()=>identity,
  byId:(id)=>id==="profileEditTrainer"?{value:selectValue}:null,
};
const code=[grab("js/app/role-governance.js","grantSafetyExceptions"),
            grab("js/app/readiness-progress.js","inviterCoachStamp"),
            grab("js/app/readiness-progress.js","trainerAssignmentForSave")].join("\n");
const api=new Function(...Object.keys(env),code+"; return {grantSafetyExceptions,inviterCoachStamp,trainerAssignmentForSave};")(...Object.values(env));
let pass=0,fail=0;
const t=(n,got,want)=>{const ok=String(got)===String(want);ok?pass++:fail++;
  console.log((ok?"  PASS  ":"  FAIL  ")+n.padEnd(54)+(ok?"":`\n         got ${got}\n        want ${want}`));};

console.log("--- who becomes the primary coach ---");
identity={id:"",role:"",displayName:"",email:""};
t("signed out stamps nothing",              JSON.stringify(api.inviterCoachStamp(null)), "{}");
identity={id:"t1",role:"trainer",displayName:"Braxton",email:"b@byui.edu"};
t("the inviting trainer is stamped",        api.inviterCoachStamp(null).assignedTrainerId, "t1");
t("their name comes with it",               api.inviterCoachStamp(null).assignedTrainerName, "Braxton");
t("a client who HAS a coach is untouched",  JSON.stringify(api.inviterCoachStamp({assignedTrainerId:"t9"})), "{}");
t("an unclaimed existing client is claimed",api.inviterCoachStamp({assignedTrainerId:""}).assignedTrainerId, "t1");
identity={id:"c1",role:"client",displayName:"Client",email:"c@byui.edu"};
t("a client account never stamps",          JSON.stringify(api.inviterCoachStamp(null)), "{}");

console.log("\n--- a trainer may claim, but never reassign ---");
identity={id:"t1",role:"trainer",displayName:"Braxton",email:"b@byui.edu"};
selectValue="t1";
t("claiming an unassigned client works",    api.trainerAssignmentForSave({assignedTrainerId:""}).id, "t1");
t("taking a colleague's client is refused", api.trainerAssignmentForSave({assignedTrainerId:"t9",assignedTrainerName:"Ana"}).id, "t9");
selectValue="t9";
t("assigning someone ELSE is refused too",  api.trainerAssignmentForSave({assignedTrainerId:""}).id, "");
selectValue="";
t("choosing shared leaves it shared",       api.trainerAssignmentForSave({assignedTrainerId:""}).id, "");

console.log("\n--- approving a safety exception grants it ---");
store=[{id:"p1",name:"Darren",injuries:["shoulder","medicalhold"]}];
identity={id:"o1",role:"owner",displayName:"Kolby",email:"k@byui.edu"};
t("two holds granted",                      api.grantSafetyExceptions("p1",["shoulder","medicalhold"],identity,"req1"), 2);
t("written onto the client",                Object.keys(store[0].safetyExceptions).sort().join(","), "medicalhold,shoulder");
t("recording who approved it",              store[0].safetyExceptions.shoulder.approvedByName, "Kolby");
t("and which request",                      store[0].safetyExceptions.shoulder.requestId, "req1");
t("an unknown client grants nothing",       api.grantSafetyExceptions("nope",["shoulder"],identity,"r"), 0);
t("no tags grants nothing",                 api.grantSafetyExceptions("p1",[],identity,"r"), 0);
t("a second grant adds, never replaces",    (api.grantSafetyExceptions("p1",["knee"],identity,"r2"), Object.keys(store[0].safetyExceptions).length), 3);
console.log("\n--- a client's own account settings ---");
const appSrc = fs.readFileSync(R + "js/app/program-app.js", "utf8");
const syncSrc = fs.readFileSync(R + "cloud-sync.js", "utf8");
const html = fs.readFileSync(R + "index.html", "utf8");
const render = fs.readFileSync(R + "js/app/rendering.js", "utf8");

// The last step of the consultation has always told clients to come to "More > Account &
// profile" to update their answers. That screen did not exist.
t("the promised screen now exists",           /client-account-settings/.test(appSrc), true);
t("and it is on the More tab",                /clientAccountCardHtml\(profile,trainerPreview\)/.test(appSrc), true);
t("the consultation still points there",      /More \u2192 Account &amp; profile/.test(html), true);

console.log("\n--- the email is shown, never edited ---");
// It is both the login and the address a trainer pre-approved them against, so a typo here
// would lock someone out of their own account with no way back.
const card = appSrc.slice(appSrc.indexOf("function clientAccountCardHtml"), appSrc.indexOf("async function openClientPasswordDialog"));
t("the address is displayed",                 /Signing in as/.test(card), true);
t("but there is no input for it",             /<input[^>]*email/i.test(card), false);
t("and it says why",                          /could lock you out/.test(card), true);

console.log("\n--- only the account holder may change it ---");
t("a self-service setter exists",             /fit4lifeCloudSetOwnPassword/.test(syncSrc), true);
t("it refuses when signed out",               /You are not signed in/.test(syncSrc), true);
t("and enforces a length",                    /at least 8 characters/.test(syncSrc), true);
// The decision was explicit: no trainer sets or sees a client's password. Supabase stores a
// one-way hash, so a readable copy would have to be stored alongside it - putting every
// client's password, including ones they reuse, one leak from the public.
t("no trainer-side password reset exists",    /resetClientPassword|setClientPassword|adminSetPassword/.test(appSrc + syncSrc), false);
t("nothing stores a readable password",       /password:\s*(profile|client|row)\./.test(appSrc + syncSrc), false);
t("a trainer previewing cannot change it",    /trainerPreview \? '' : '<button[^>]*openClientPasswordDialog/.test(card), true);

console.log("\n--- the dialog itself ---");
t("the field is a password field",            (appSrc.match(/type:"password"/g) || []).length, 2);
t("it is confirmed before being applied",     /Those did not match\. Nothing was changed\./.test(appSrc), true);
t("the prompt supports the note it is given", /settings\.note \? '<p class="storage-note">/.test(render), true);
// Without this the browser offers the OLD password as the suggestion for the new one.
t("and does not autofill the old password",   /autocomplete="new-password"/.test(render), true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
