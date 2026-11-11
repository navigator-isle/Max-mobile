// Turns the Obsidian IMO notes (notes/imo/**.md) into Max's note format and writes them into worker.js (const IMO_NOTES).
//   node notes/imo-to-js.mjs
import fs from "fs"; import path from "path";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = s => esc(s.replace(/\[\[([^\]|]+)(\|([^\]]+))?\]\]/g, (_, a, __, b) => b || a)).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
function toHtml(md) {
  let tags = [], lines = md.replace(/\r/g, "").split("\n");
  if (lines[0] === "---") { const end = lines.indexOf("---", 1); const fm = lines.slice(1, end).join("\n"); const m = /tags:\s*\[([^\]]*)\]/.exec(fm); if (m) tags = m[1].split(",").map(t => t.trim()).filter(Boolean); lines = lines.slice(end + 1); }
  let out = "", depth = 0;
  const close = to => { while (depth > to) { out += depth > 1 ? "</li></ul>" : "</li></ul>"; depth--; } };
  for (const raw of lines) {
    const m = /^(\s*)- (.*)$/.exec(raw);
    if (m) {
      const d = Math.floor(m[1].length / 2) + 1;
      if (d > depth) { while (depth < d) { out += "<ul><li>"; depth++; } out += inline(m[2]); }
      else { close(d); out += "</li><li>" + inline(m[2]); }
      continue;
    }
    close(0);
    const t = raw.trim(); if (!t) continue;
    if (t === "---") out += "<hr>";
    else if (/^\*\*[^*]+\*\*$/.test(t)) out += "<p><b>" + inline(t.slice(2, -2)) + "</b></p>";
    else out += "<p>" + inline(t) + "</p>";
  }
  close(0);
  return { body: out.replace(/<ul><li><\/li>/g, "<ul>"), tags };
}
const notes = [];
for (const [dir, cat] of [["", "Maritime › IMO"], ["Conventions", "Maritime › IMO › Conventions"], ["Codes", "Maritime › IMO › Codes"]]) {
  const d = path.join(ROOT, "notes", "imo", dir);
  for (const f of fs.readdirSync(d).filter(f => f.endsWith(".md")).sort()) {
    const title = f.slice(0, -3), { body, tags } = toHtml(fs.readFileSync(path.join(d, f), "utf8"));
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    notes.push({ id: "note-imo-" + slug, v: 1, title, category: cat, tags: [...new Set([...(tags.length ? tags : [slug.split("-")[0]]), "imo", dir ? dir.toLowerCase().replace(/s$/, "") : "index"])].slice(0, 12), body });
  }
}
const W = path.join(ROOT, "worker.js"), src = fs.readFileSync(W, "utf8"), line = "const IMO_NOTES = " + JSON.stringify(notes) + ";";
const next = /^const IMO_NOTES = .*;$/m.test(src) ? src.replace(/^const IMO_NOTES = .*;$/m, () => line) : src.replace(/^(const SEED_NOTES = .*;)$/m, (all) => all + "\n// IMO conventions and codes (Obsidian notes in notes/imo, made by notes/imo-to-js.mjs).\n" + line);
fs.writeFileSync(W, next);
console.log(notes.length + " IMO notes, " + line.length + " bytes");
