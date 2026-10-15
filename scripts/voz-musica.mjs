#!/usr/bin/env node
// Confere a mistura de voz e trilha sem ouvir: subtrai a versão sem música da versão com música
// (a voz é a mesma, no mesmo tempo) e mede, em janelas, quanto a voz fica acima da música.
// Uso: node scripts/voz-musica.mjs <com-musica.mp4> <sem-musica.mp4> [--janela 4] [--ate <fim da fala em s>]
// Efeitos sonoros com volume diferente nas duas versões contam como "música": use --ate para parar no fim da fala.
// Alvo: voz 10–18 dB acima da música durante a fala. Abaixo de 8 dB a música compete com a voz.
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const [comArq, semArq] = args.filter((a) => !a.startsWith("--") && !/^\d+(\.\d+)?$/.test(a));
if (!comArq || !semArq) { console.error("Uso: node scripts/voz-musica.mjs <com-musica.mp4> <sem-musica.mp4> [--janela 4] [--ate <s>]"); process.exit(1); }
const janela = Number(args[args.indexOf("--janela") + 1]) || 4;
const ate = args.includes("--ate") ? Number(args[args.indexOf("--ate") + 1]) : Infinity;
const SR = 16000;
const pcm = (f) => {
  const r = spawnSync("ffmpeg", ["-nostdin", "-v", "error", "-i", f, "-vn", "-ac", "1", "-ar", String(SR), "-f", "s16le", "-"], { maxBuffer: 1 << 30 });
  if (r.status !== 0) { console.error(`✗ não consegui ler ${f}`); process.exit(1); }
  const a = new Float32Array(r.stdout.length / 2);
  for (let i = 0; i < a.length; i++) a[i] = r.stdout.readInt16LE(2 * i) / 32768;
  return a;
};
const com = pcm(comArq), sem = pcm(semArq), n = Math.min(com.length, sem.length, Number.isFinite(ate) ? Math.floor(ate * SR) : Infinity);
let xy = 0, yy = 0;
for (let i = 0; i < n; i++) { xy += com[i] * sem[i]; yy += sem[i] * sem[i]; }
const g = xy / yy; // mesma voz nas duas: o ganho entre elas
// Mede só nos quadros de 50 ms em que há voz de fato (voz a menos de 20 dB do seu pico na janela).
const Q = SR / 20;
const quadros = [];
for (let a = 0; a + Q <= n; a += Q) {
  let v = 0, m = 0;
  for (let i = a; i < a + Q; i++) { const s = g * sem[i], r = com[i] - s; v += s * s; m += r * r; }
  quadros.push({ t: a / SR, v: v / Q, m: m / Q });
}
const dB = (x) => 10 * Math.log10(x + 1e-12);
const linhas = [];
for (let de = 0; de < n / SR - 0.5; de += janela) {
  const q = quadros.filter((x) => x.t >= de && x.t < de + janela);
  const pico = Math.max(...q.map((x) => x.v));
  const fala = q.filter((x) => dB(x.v) > Math.max(dB(pico) - 20, -50));
  const musica = dB(q.reduce((s, x) => s + x.m, 0) / q.length);
  if (fala.length < q.length * 0.25) { linhas.push({ de, ate: Math.min(de + janela, n / SR), voz: null, musica, margem: null }); continue; }
  const voz = dB(fala.reduce((s, x) => s + x.v, 0) / fala.length), sob = dB(fala.reduce((s, x) => s + x.m, 0) / fala.length);
  linhas.push({ de, ate: Math.min(de + janela, n / SR), voz, musica: sob, margem: voz - sob });
}
console.log(`# voz × música — ${comArq} (ganho entre as versões: ${(20 * Math.log10(g)).toFixed(1)} dB)\n`);
for (const l of linhas) {
  const t = `${l.de.toFixed(1)}–${l.ate.toFixed(1)} s`.padEnd(14);
  if (l.margem === null) { console.log(`${t} sem fala · música ${l.musica.toFixed(1)} dB`); continue; }
  const aviso = l.margem < 8 ? "  ⚠ música compete com a voz" : l.margem > 22 ? "  (música quase some)" : "";
  console.log(`${t} voz ${l.voz.toFixed(1)} · música ${l.musica.toFixed(1)} · voz acima: ${l.margem.toFixed(1)} dB${aviso}`);
}
const fala = linhas.filter((l) => l.margem !== null);
if (fala.length) console.log(`\nmenor margem na fala: ${Math.min(...fala.map((l) => l.margem)).toFixed(1)} dB (alvo 10–18 dB)`);
