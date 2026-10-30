// Notes sent from the phone, used-note references, long answers, read_note action.
let last = null, next = null;
globalThis.fetch = async (u, o) => { last = JSON.parse(o.body); const r = next || { text: JSON.stringify({ reply: "From your Ballast procedure note: start pump 2.", used_notes: ["Ballast procedure", "Made up title"] }) }; next = null;
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: r.text }] }, finishReason: r.finish || "STOP" }] })); };
const { default: w } = await import(process.argv[2]);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const chat = async (body, env = { GEMINI_API_KEY: "k" }) => { const r = await w.fetch(new Request("https://x/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }), env); return { status: r.status, data: await r.json() }; };
const sys = () => last.systemInstruction.parts[0].text;
const notes = { index: [{ t: "Ballast procedure", c: "Maritime › Ballast" }, { t: "Family birthdays", c: "Personal" }],
  items: [{ id: "n1", title: "Ballast procedure", category: "Maritime › Ballast", text: "Open the sea suction first, then start ballast pump No. 2." }],
  active: { id: "n9", title: "Mooring checks", category: "Maritime › Mooring", text: "Check winch brakes every port call." } };
let r = await chat({ message: "which pump do I start?", allowActions: true, notes });
ok(sys().includes("Open the sea suction first") && sys().includes("USER'S NOTES"), "notes sent from the phone reach Max (no database needed)");
ok(sys().includes("HIS NOTES LIBRARY") && sys().includes("- Family birthdays (Personal)"), "Max sees the list of all his notes");
ok(sys().includes("THE NOTE OPEN ON HIS SCREEN NOW") && sys().includes("winch brakes"), "Max sees the note that is open (\"this note\")");
ok(sys().includes("never say you cannot access his notes"), "Max is told he can read the notes");
ok(JSON.stringify(r.data.notesUsed) === '["Ballast procedure"]', "only real note titles shown as references", JSON.stringify(r.data.notesUsed));
ok(last.generationConfig.maxOutputTokens === 8192, "answer limit raised (thinking no longer cuts answers)");
r = await chat({ message: "explain in detail", voice: true, notes });
ok(sys().includes("give the complete answer"), "voice mode gives full answers when asked to explain");
next = { text: JSON.stringify({ reply: "Part one of a long answer" }), finish: "MAX_TOKENS" };
r = await chat({ message: "tell me everything", allowActions: true });
ok(r.data.truncated === true && r.data.reply.includes("continue"), "if an answer is still cut off, Max says so and offers to continue");
next = { text: JSON.stringify({ reply: "Reading it now.", action: { type: "read_note", query: "Ballast procedure" } }) };
r = await chat({ message: "go through my ballast note out loud", allowActions: true, notes });
ok(r.data.action?.type === "read_note" && r.data.action.query === "Ballast procedure", "read_note action supported");
const huge = { items: Array.from({ length: 20 }, (_, i) => ({ id: "x" + i, title: "N" + i, text: "y".repeat(9000) })), index: Array.from({ length: 900 }, (_, i) => ({ t: "T" + i })) };
r = await chat({ message: "hi", allowActions: true, notes: huge });
ok(r.status === 200 && sys().length < 40000, "very large notes are trimmed safely", String(sys().length));
r = await chat({ message: "hi", allowActions: true, notes: "garbage" });
ok(r.status === 200, "bad notes data ignored");
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
