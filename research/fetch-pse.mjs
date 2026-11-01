// Downloads daily price history for PSE stocks from PSE Edge (public data) into research/data/*.csv
import fs from "node:fs";
const UA = "MaxPersonalAssistant/1.0 (personal research; +https://navigator-isle.github.io/Max-mobile/)";
const TIERS = {
  blue: "AC ACEN AEV AGI ALI AREIT BDO BLOOM BPI CBC CNPF CNVRG DMC EMI GLO GTCAP ICT JFC JGS LTG MBT MER MONDE PGOLD SCC SM SMC SMPH TEL URC".split(" "),
  middle: "CEB FGEN MWC PCOR SECB RRHI WLCON DNL FB NIKL PX AP FLI MEG RLC CLI VREIT DDMPR SPNEC AXLM CREIT FILRT CNPF PNB EW RCB PSB COSCO SSI MAXS PIZZA ALLHC".split(" "),
  spec: "DITO LPZ APX TECH MAC ATN IMI NOW DWC ABA BEL ROCK PHN SGI SLI MRSGI GSMI VLL CEI PLUS MEDIC CA ANS ECVC HOUSE PAL MA BCOR SHLPH STI LODE OPM".split(" ")
};
const mdy = d => String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0") + "-" + d.getUTCFullYear();
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync("research/data", { recursive: true });
const index = [];
for (const [tier, syms] of Object.entries(TIERS)) for (const sym of [...new Set(syms)]) {
  try {
    const list = await (await fetch("https://edge.pse.com.ph/autoComplete/searchCompanyNameSymbol.ax?term=" + sym, { headers: { "User-Agent": UA, Accept: "application/json" } })).json();
    const c = list.find(x => String(x.symbol).toUpperCase() === sym); if (!c) throw new Error("not found");
    const html = await (await fetch("https://edge.pse.com.ph/companyPage/stockData.do?cmpy_id=" + c.cmpyId, { headers: { "User-Agent": UA } })).text();
    const sel = html.match(/<select[^>]*name=["']?security_id["']?[^>]*>([\s\S]*?)<\/select>/i)?.[1] || "";
    const opt = sel.match(/<option[^>]*value=["']?(\d+)["']?[^>]*selected/i) || sel.match(/<option[^>]*value=["']?(\d+)/i);
    if (!opt) throw new Error("no security id");
    const r = await fetch("https://edge.pse.com.ph/common/DisclosureCht.ax", { method: "POST", headers: { "Content-Type": "application/json", "User-Agent": UA }, body: JSON.stringify({ cmpy_id: String(c.cmpyId), security_id: opt[1], startDate: mdy(new Date(Date.UTC(2014, 0, 1))), endDate: mdy(new Date()) }) });
    const d = await r.json(); const rows = d.chartData || [];
    if (!rows.length) throw new Error("no rows");
    if (!index.length) console.log("FIELDS:", JSON.stringify(rows[0]));
    const keys = Object.keys(rows[0]);
    fs.writeFileSync(`research/data/${sym}.csv`, keys.join(",") + "\n" + rows.map(x => keys.map(k => String(x[k] ?? "").replace(/,/g, "")).join(",")).join("\n") + "\n");
    index.push({ sym, tier, name: c.cmpyNm, rows: rows.length, from: rows[0].CHART_DATE, to: rows.at(-1).CHART_DATE });
    console.log(tier, sym, rows.length, rows[0].CHART_DATE, "→", rows.at(-1).CHART_DATE);
  } catch (e) { console.log("SKIP", tier, sym, e.message); index.push({ sym, tier, error: e.message }); }
  await sleep(600);
}
fs.writeFileSync("research/data/index.json", JSON.stringify(index, null, 1));
