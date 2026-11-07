// Builds the folder Cloudflare serves (./site): Max's phone app, plus a private backup copy of ALL of Max's
// code at site/_src/max-code.zip. The Worker never shows _src/ to the public; it attaches the zip to the
// weekly backup email and to "Download code backup" — so Max can be rebuilt without GitHub.
// Run: node build.mjs   (deploy.sh / deploy.bat and "npx wrangler deploy" run it for you)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const APP = ['index.html', 'privacy.html', 'manifest.webmanifest', 'sw.js', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];
const EXTRA = ['worker.js', 'wrangler.jsonc', 'build.mjs', 'deploy.sh', 'deploy.bat', 'DEPLOY.md', 'SETUP.md', 'README.md', 'README.txt', '.gitignore'];
const dirFiles = d => fs.existsSync(path.join(ROOT, d)) ? fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap(e => e.isDirectory() ? dirFiles(d + '/' + e.name) : [d + '/' + e.name]) : [];
// Never pack secrets or local junk.
const SKIP = /(^|\/)(\.env|\.dev\.vars|node_modules|\.wrangler|site|test-results)(\/|$)|\.(p12|jks|keystore|pem|key)$/i;
const files = [...APP, ...EXTRA, ...dirFiles('trader'), ...dirFiles('tests'), ...dirFiles('.github')].filter(f => fs.existsSync(path.join(ROOT, f)) && !SKIP.test(f));

const T = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; }
const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
// Plain "stored" zip: opens on Windows, Mac, Android and in Google Drive.
function zip(entries) {
  const parts = [], central = []; let off = 0;
  const d = new Date(), dt = ((d.getFullYear() - 1980) << 9 | (d.getMonth() + 1) << 5 | d.getDate()) & 0xffff, tm = (d.getHours() << 11 | d.getMinutes() << 5 | (d.getSeconds() >> 1)) & 0xffff;
  for (const [name, data] of entries) {
    const nm = Buffer.from('Max/' + name, 'utf8'), crc = crc32(data);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(0, 8); h.writeUInt16LE(tm, 10); h.writeUInt16LE(dt, 12);
    h.writeUInt32LE(crc, 14); h.writeUInt32LE(data.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(nm.length, 26); h.writeUInt16LE(0, 28);
    parts.push(h, nm, data);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(0, 10); c.writeUInt16LE(tm, 12); c.writeUInt16LE(dt, 14);
    c.writeUInt32LE(crc, 16); c.writeUInt32LE(data.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(nm.length, 28); c.writeUInt32LE(off, 42);
    central.push(c, nm); off += 30 + nm.length + data.length;
  }
  const cd = Buffer.concat(central), e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(entries.length, 8); e.writeUInt16LE(entries.length, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, e]);
}

const SITE = path.join(ROOT, 'site');
fs.rmSync(SITE, { recursive: true, force: true }); fs.mkdirSync(path.join(SITE, '_src'), { recursive: true });
for (const f of APP) fs.copyFileSync(path.join(ROOT, f), path.join(SITE, f));
const built = new Date().toISOString();
const z = zip(files.map(f => [f, fs.readFileSync(path.join(ROOT, f))]));
fs.writeFileSync(path.join(SITE, '_src', 'max-code.zip'), z);
fs.writeFileSync(path.join(SITE, '_src', 'files.json'), JSON.stringify({ built, files, bytes: z.length }));
console.log(`site/ ready: ${APP.length} app files · code backup ${files.length} files, ${Math.round(z.length / 1024)} KB`);
