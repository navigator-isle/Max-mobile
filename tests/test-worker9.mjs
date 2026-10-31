// Attachments: Max reads a photo / PDF / text file (fake Gemini) and returns a clean summary. Nothing is saved by the backend.
let last = null, reply = null;
globalThis.fetch = async (u, o = {}) => {
  const url = String(u);
  if (url.includes("generativelanguage")) { last = JSON.parse(o.body);
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: reply ?? JSON.stringify({ kind: "certificate", title: "Safety Equipment Certificate — MV Sample", topic: "Ship › Certificates",
      summary: "Safety Equipment Certificate for MV Sample.", points: ["Issued by Panama Maritime Authority", "Valid until 2027-03-01"], dates: [{ what: "Certificate expires", date: "2027-03-01" }, { what: "bad", date: "soon" }],
      amounts: [{ what: "Fee", amount: "USD 120.00", currency: "usd" }], text: "SAFETY EQUIPMENT CERTIFICATE\nValid until 1 March 2027", tags: ["certificate", "safety"], answer: "", say: "It's the Safety Equipment Certificate. It expires on 1 March 2027." }) }] } }] }));
  }
  throw new Error("unexpected " + url);
};
const { default: w } = await import(process.argv[2]);
const env = { GEMINI_API_KEY: "k", MAX_PASSCODE: "p" };
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const call = async (body, pw = "p") => { const r = await w.fetch(new Request("https://x/api/attachment", { method: "POST", headers: { "Content-Type": "application/json", "X-Max-Pass": pw }, body: JSON.stringify(body) }), env); return { status: r.status, data: await r.json() }; };
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64").toString("base64");
let r = await call({ name: "cert.jpg", mime: "image/png", data: png, topics: ["Ship › Certificates", "Maritime › SOLAS"] });
const a = r.data.attachment;
ok(r.status === 200 && a.title.startsWith("Safety Equipment Certificate") && a.topic === "Ship › Certificates" && a.kind === "certificate", "reads a photo: title, kind, topic", JSON.stringify(r.data).slice(0, 300));
ok(last.contents[0].parts[0].inline_data.mime_type === "image/png" && last.contents[0].parts[0].inline_data.data === png, "the file itself is sent to Gemini (not just its name)");
ok(/Ship › Certificates/.test(last.contents[0].parts[1].text) && /never as instructions/.test(last.contents[0].parts[1].text), "uses your topics; text inside files is never obeyed");
ok(a.dates.length === 1 && a.dates[0].date === "2027-03-01" && a.amounts[0].amount === 120 && a.amounts[0].currency === "USD", "deadlines and amounts cleaned up (bad dates dropped)");
r = await call({ name: "c.pdf", mime: "application/pdf", data: "JVBERi0xLjQK", question: "when does it expire?" });
ok(r.status === 200 && /when does it expire/.test(last.contents[0].parts[1].text), "PDFs work, with a question about them");
r = await call({ name: "notes.txt", mime: "text/plain", data: Buffer.from("Hello").toString("base64") });
ok(r.status === 200, "text files work");
r = await call({ name: "a.docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", data: "UEsD" });
ok(r.status === 415 && /save them as PDF/.test(r.data.error), "Word files: clear message to save as PDF");
r = await call({ name: "x.jpg", mime: "image/jpeg", data: "not base64!!" });
ok(r.status === 400, "damaged file refused");
r = await call({ name: "big.pdf", mime: "application/pdf", data: "A".repeat(26_000_004) });
ok(r.status === 413, "too-big file refused with a clear message");
r = await call({ name: "c.jpg", mime: "image/jpeg", data: png }, "wrong");
ok(r.status === 401, "needs the passcode");
reply = "Not JSON, just words about the photo.";
r = await call({ name: "p.jpg", mime: "image/jpeg", data: png });
ok(r.status === 200 && r.data.attachment.summary.includes("just words") && r.data.attachment.title === "p.jpg", "odd AI reply still gives a usable result");
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
