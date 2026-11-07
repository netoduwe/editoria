// Renderiza index.html quadro a quadro e envia ao ffmpeg.
// Uso: node render.mjs [saida.mp4] [fps]
//      node render.mjs --stills 1,2.5,...   quadros soltos em out/still_<t>.jpg
//      node render.mjs --cues               exporta out/cues.json (eventos de áudio)
//      node render.mjs --audit              confere a zona segura do Reels quadro a quadro
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
fs.mkdirSync('out', { recursive: true });

const args = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', e => console.error('PAGE ERROR:', e.message));
await page.goto(pathToFileURL(path.resolve('index.html')).href);
await page.waitForFunction(() => window.__ready === true);

if (args[0] === '--cues') {
  fs.writeFileSync('out/cues.json', JSON.stringify(await page.evaluate(() => ({ cues: window.CUES, duration: window.DURATION, bpm: window.BPM || 114 })), null, 1));
} else if (args[0] === '--stills') {
  for (const t of args[1].split(',').map(Number)) {
    await page.evaluate(t => renderAt(t), t);
    await page.screenshot({ path: `out/still_${t}.jpg`, type: 'jpeg', quality: 85 });
  }
} else if (args[0] === '--audit') {
  // Para cada texto visível, estima a caixa de tinta (não a caixa de linha) e compara com a zona segura.
  const step = +(args[1] || 0.1);
  const dur = await page.evaluate(() => window.DURATION);
  const hits = {};
  for (let i = 0; i * step <= dur; i++) {
    const t = +(i * step).toFixed(3);
    const found = await page.evaluate(t => {
      renderAt(t);
      const S = window.SAFE, cv = document.createElement('canvas').getContext('2d'), out = [];
      const opacity = el => { let o = 1; for (let n = el; n && n.id !== 'root'; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === 'none') return 0; o *= +cs.opacity; } return getComputedStyle(el).visibility === 'visible' ? o : 0; };
      // recorte efetivo: tela inteira ∩ ancestrais com overflow != visible
      const clipOf = el => { let c = { l: 0, t: 0, r: 1080, b: 1920 };
        for (let n = el.parentElement; n && n.id !== 'root'; n = n.parentElement) {
          if (getComputedStyle(n).overflow !== 'visible') { const q = n.getBoundingClientRect(); c = { l: Math.max(c.l, q.left), t: Math.max(c.t, q.top), r: Math.min(c.r, q.right), b: Math.min(c.b, q.bottom) }; } }
        return c; };
      const cut = (r, c) => { const q = { left: Math.max(r.left, c.l), top: Math.max(r.top, c.t), right: Math.min(r.right, c.r), bottom: Math.min(r.bottom, c.b) };
        return q.right - q.left > 2 && q.bottom - q.top > 2 ? q : null; };
      const leaves = [...document.querySelectorAll('#cam *')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()));
      for (const e of leaves) {
        if (e.closest('.sweep')) continue;
        const wr = e.closest('.wr'); if (wr && parseFloat(getComputedStyle(wr).getPropertyValue('--p')) <= 1) continue;   // ainda não escrito
        const o = opacity(e); if (o < 0.3) continue;
        const rg = document.createRange(); rg.selectNodeContents(e); const r = rg.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const cs = getComputedStyle(e), fs = parseFloat(cs.fontSize);
        cv.font = `${cs.fontStyle} ${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
        let s = e.textContent.trim(); if (cs.textTransform === 'uppercase') s = s.toUpperCase();
        const m = cv.measureText(s), A = m.fontBoundingBoxAscent, D = m.fontBoundingBoxDescent;
        const k = r.height / (A + D);                         // escala aparente na tela
        const q = cut({ left: r.left, right: r.right, top: r.top + (A - m.actualBoundingBoxAscent) * k, bottom: r.bottom - (D - m.actualBoundingBoxDescent) * k }, clipOf(e));
        if (!q) continue;
        const over = Math.max(S.left - q.left, q.right - S.right, S.top - q.top, q.bottom - S.bottom);
        if (over > 4) out.push([(e.id || e.closest('[id]').id) + ':' + s.slice(0, 16), Math.round(over), Math.round(q.left), Math.round(q.top), Math.round(q.right), Math.round(q.bottom)]);
      }
      for (const e of document.querySelectorAll('#cam [data-safe]')) {
        if (opacity(e) < 0.3) continue;
        const r = cut(e.getBoundingClientRect(), clipOf(e)); if (!r) continue;
        const over = Math.max(S.left - r.left, r.right - S.right, S.top - r.top, r.bottom - S.bottom);
        if (over > 4) out.push([e.id + ':box', Math.round(over), Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]);
      }
      return out;
    }, t);
    for (const [key, over, ...box] of found) (hits[key] ||= []).push({ t, over, box });
  }
  // agrupa em intervalos contínuos
  const rows = [];
  for (const [key, list] of Object.entries(hits)) {
    let cur = null;
    for (const h of list) {
      if (cur && h.t - cur.end <= step * 1.5) { cur.end = h.t; if (h.over > cur.over) Object.assign(cur, { over: h.over, box: h.box, tMax: h.t }); }
      else { cur = { key, start: h.t, end: h.t, over: h.over, box: h.box, tMax: h.t }; rows.push(cur); }
    }
  }
  rows.sort((a, b) => a.start - b.start);
  for (const r of rows) console.log(`${r.start.toFixed(1)}–${r.end.toFixed(1)}s  ${(r.end - r.start + step).toFixed(1)}s  +${r.over}px  ${r.key}  [${r.box.join(',')}] @${r.tMax}`);
  console.log(`${rows.length} intervalo(s) fora da zona segura`);
} else {
  const out = args[0] || 'out/raw.mp4', fps = +(args[1] || 30);
  const dur = await page.evaluate(() => window.DURATION);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round(dur * fps);
  for (let i = 0; i < n; i++) {
    await page.evaluate(t => renderAt(t), i / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 90 === 0) console.error(`${i}/${n}`);
  }
  const finished = new Promise((resolve, reject) => {
    ff.once('error', reject);
    ff.once('close', code => code === 0 ? resolve() : reject(new Error(`FFmpeg encerrou com código ${code}`)));
  });
  ff.stdin.end(); await finished;
}
await browser.close();
