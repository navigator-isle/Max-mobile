import { createRequire } from "node:module";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url);
const { chromium, devices } = require("playwright");
const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ["--no-sandbox"] });
const p = await (await b.newContext({ ...devices["Pixel 7"] })).newPage();
const errs=[];p.on("pageerror",e=>errs.push(e.message));
await p.goto("file://" + process.argv[2]); await p.waitForTimeout(500);
const cases = [
 ["show keyboard","show_keyboard"],["Max, can you bring up the keyboard please","show_keyboard"],["I'd rather type","show_keyboard"],["let me type it","show_keyboard"],["gusto kong mag type","show_keyboard"],["type na lang ako","show_keyboard"],
 ["hide the keyboard","hide_keyboard"],["I don't need the keyboard anymore","hide_keyboard"],["voice only","hide_keyboard"],
 ["show my notes","show_notes"],["open my second brain","show_notes"],["pull up what I have on ballast in my notes","show_notes:ballast"],["do I have notes about mooring","show_notes:mooring"],["find bunkering in my notes","show_notes:bunkering"],["pakita mga notes ko tungkol sa ballast","show_notes:ballast"],["notes","show_notes"],
 ["what do my notes say about ballast?",null],["how many pumps do we have",null],["tell me a joke",null],["what's the weather in Manila",null],
 ["open the ballast procedure note","open_note:ballast procedure"],
 ["research the latest BWM rules","research:BWM rules"],["can you look up the new MARPOL Annex VI changes","research:the new MARPOL Annex VI changes"],["check online if the CII rating rules changed","research:the CII rating rules changed"],["find out about ECDIS updates","research:ECDIS updates"],
 ["show me your research","show_research"],["let me see what you found","show_research"],
 ["save that to my notes","save_answer"],["put this in my notes","save_answer"],["okay show my notes","show_notes"],
 ["create a new note about mooring winches","new_note:mooring winches"],["start a note","new_note"],
 ["organize my notes","organize_notes"],["sort my notes into topics","organize_notes"],["ayusin mo ang notes ko","organize_notes"],
 ["export my notes","export_notes"],["download all my notes","export_notes"],
 ["open settings","open_settings"],["take me to the settings","open_settings"],
 ["what's on my schedule today","list_schedule:today"],["what do I have tomorrow","list_schedule:tomorrow"],["anong lakad ko bukas","list_schedule:tomorrow"],["show my calendar this week","list_schedule:week"],["do I have any meetings today?","list_schedule:today"],["what are my tasks","list_schedule:today"],
 ["remind me Friday 9am to renew my passport",null],["add buy safety shoes to my to-do list",null],["set a reminder for 6pm to call home",null],["what's the plan for the ballast operation?",null],["paalala bukas ng 8am mag bunker",null],
 ["go back","go_home"],["just talk","go_home"],["close the notes","go_home"],["balik","go_home"],["let's just talk","go_home"],
];
const res = await p.evaluate(cs => cs.map(([t]) => { const a = window.MaxDebug.understand(t); return a ? a.type + (a.query ? ":" + a.query : "") : null; }), cases);
let pass=0,fail=0;
cases.forEach(([t,exp],i)=>{const got=res[i];const ok=exp===null?got===null:got&&(exp.includes(":")?got.toLowerCase()===exp.toLowerCase():got.split(":")[0]===exp);ok?pass++:fail++;if(!ok)console.log("FAIL",JSON.stringify(t),"→",got,"expected",exp)});
// research-screen commands with a draft
await p.evaluate(()=>{localStorage.setItem('max_research_draft',JSON.stringify({title:'BWM',topic:'Maritime › BWM',points:['a','b'],sources:[]}))});
await p.reload(); await p.waitForTimeout(400);
await p.evaluate(()=>{document.querySelector('[data-go=research]').click()}); // open research screen via menu
await p.evaluate(()=>{document.getElementById('quickMenu').hidden=false});
await p.click('[data-go=research]'); await p.waitForTimeout(200);
const rcases=[["approve it","approve_research"],["looks good, save it","approve_research"],["sige","approve_research"],["ok na yan","approve_research"],["discard it","reject_research"],["don't save that","reject_research"],["change point 2 to 200 nautical miles","edit_research"],["add the depth requirement","edit_research"],["make it shorter","edit_research"],["palitan mo yung point 1","edit_research"]];
const r2=await p.evaluate(cs=>cs.map(([t])=>{const a=window.MaxDebug.understand(t);return a?a.type:null}),rcases);
rcases.forEach(([t,exp],i)=>{const ok=r2[i]===exp;ok?pass++:fail++;if(!ok)console.log("FAIL (research)",JSON.stringify(t),"→",r2[i],"expected",exp)});
console.log(`${pass} passed, ${fail} failed`, errs.length?"ERRORS: "+errs.join("|"):"");
await b.close();
