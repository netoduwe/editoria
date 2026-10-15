#!/usr/bin/env node
// Acha onde a voz realmente começa e termina e as pausas dentro de cada trecho, pela energia do áudio.
// Use antes de escrever o edl.json: a transcrição estica a última palavra de cada frase (às vezes 1 s)
// e pode adiantar o início das palavras em ~0,2 s. O bruto nunca é alterado.
// Uso: node scripts/pausas.mjs <video> [inicio-fim ...] [--min 0.25] [--json]
//   sem trechos: analisa o arquivo inteiro.  --min: menor pausa listada (s).
// Exemplo: node scripts/pausas.mjs entrada/bruto.mov 13.3-17.8 42.2-48.5
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const video = args.find((a) => !a.startsWith("--") && !/^\d+(\.\d+)?-\d+(\.\d+)?$/.test(a));
if (!video) { console.error("Uso: node scripts/pausas.mjs <video> [inicio-fim ...] [--min 0.25] [--json]"); process.exit(1); }
const minPausa = Number(args[args.indexOf("--min") + 1]) || 0.25;
const json = args.includes("--json");

const SR = 16000, PASSO = 0.01, JANELA = 320; // 20 ms de janela a cada 10 ms
const r = spawnSync("ffmpeg", ["-nostdin", "-v", "error", "-i", video, "-vn", "-ac", "1", "-ar", String(SR), "-af", "highpass=f=90", "-f", "s16le", "-"], { maxBuffer: 1 << 30 });
if (r.status !== 0) { console.error(`✗ não consegui ler o áudio de ${video}`); process.exit(1); }
const pcm = r.stdout, n = pcm.length / 2, dur = n / SR;
const db = [];
for (let t = 0; t + JANELA / SR <= dur; t += PASSO) {
  const i = Math.floor(t * SR); let s = 0;
  for (let k = 0; k < JANELA; k++) { const v = pcm.readInt16LE(2 * (i + k)) / 32768; s += v * v; }
  db.push(10 * Math.log10(s / JANELA + 1e-12));
}
const ord = [...db].sort((a, b) => a - b), pct = (p) => ord[Math.floor(ord.length * p)];
const piso = pct(0.1), fala = pct(0.75), limiar = piso + 0.4 * (fala - piso);

// Trechos com voz: acima do limiar, juntando quedas curtas (consoantes) e descartando estalos.
const voz = [];
let ini = null;
db.forEach((v, i) => {
  const t = i * PASSO;
  if (v >= limiar && ini === null) ini = t;
  if (v < limiar && ini !== null) { voz.push([ini, t]); ini = null; }
});
if (ini !== null) voz.push([ini, db.length * PASSO]);
const juntos = [];
for (const s of voz) { const u = juntos.at(-1); if (u && s[0] - u[1] < 0.12) u[1] = s[1]; else juntos.push([...s]); }
const fala2 = juntos.filter(([a, b]) => b - a >= 0.06);

const trechos = args.filter((a) => /^\d+(\.\d+)?-\d+(\.\d+)?$/.test(a)).map((a) => a.split("-").map(Number));
if (!trechos.length) trechos.push([0, dur]);
const f2 = (x) => Number(x.toFixed(2));
const saida = { arquivo: video, duracao_s: f2(dur), piso_ruido_db: f2(piso), nivel_fala_db: f2(fala), limiar_db: f2(limiar), trechos: [] };
for (const [a, b] of trechos) {
  const dentro = fala2.filter(([x, y]) => y > a && x < b).map(([x, y]) => [Math.max(x, a), Math.min(y, b)]);
  if (!dentro.length) { saida.trechos.push({ trecho: `${a}-${b}`, voz: null }); continue; }
  const pausas = [];
  for (let i = 1; i < dentro.length; i++) {
    const p = [dentro[i - 1][1], dentro[i][0]];
    if (p[1] - p[0] >= minPausa) pausas.push({ de: f2(p[0]), ate: f2(p[1]), dur: f2(p[1] - p[0]), cortar_de: f2(p[0] + 0.06), cortar_ate: f2(p[1] - 0.06) });
  }
  const vi = dentro[0][0], vf = dentro.at(-1)[1];
  saida.trechos.push({ trecho: `${a}-${b}`, voz_inicio: f2(vi), voz_fim: f2(vf), sugestao_inicio: f2(Math.max(0, vi - 0.12)), sugestao_fim: f2(Math.min(dur, vf + 0.14)), pausas });
}

if (json) { console.log(JSON.stringify(saida, null, 2)); process.exit(0); }
console.log(`# ${video} — ${saida.duracao_s} s · ruído ${saida.piso_ruido_db} dB · fala ${saida.nivel_fala_db} dB · limiar ${saida.limiar_db} dB\n`);
for (const t of saida.trechos) {
  if (!t.voz_inicio && t.voz_inicio !== 0) { console.log(`${t.trecho}: sem voz`); continue; }
  console.log(`${t.trecho}: voz ${t.voz_inicio}–${t.voz_fim} → corte sugerido ${t.sugestao_inicio}–${t.sugestao_fim}`);
  for (const p of t.pausas) console.log(`   pausa ${p.de}–${p.ate} (${p.dur} s) → para cortar: ${p.cortar_de}–${p.cortar_ate}`);
}
