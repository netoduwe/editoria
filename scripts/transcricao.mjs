#!/usr/bin/env node
// Mostra a transcrição como roteiro com tempos, agrupada por pausas, e aponta prováveis retakes.
// Uso: node scripts/transcricao.mjs <transcript.json> [--video <bruto>] [--pausa 0.45]
// transcript.json = saída de `npx hyperframes transcribe` (lista de palavras com text/start/end).
// Com --video, mede o volume de cada trecho: tomadas muito mais baixas costumam ser ensaio/fala fora do microfone.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const arq = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
if (!arq) { console.error("Uso: node scripts/transcricao.mjs <transcript.json> [--video <bruto>] [--pausa 0.45]"); process.exit(1); }
const pausa = Number(opt("--pausa") ?? 0.45);
const video = opt("--video");
const bruto = JSON.parse(readFileSync(arq, "utf8"));
const palavras = (Array.isArray(bruto) ? bruto : bruto.words ?? []).filter((w) => (w.text ?? w.word ?? "").trim());

const linhas = [];
let atual = null;
for (const w of palavras) {
  const t = (w.text ?? w.word).trim();
  if (!atual || w.start - atual.fim > pausa || /[.?!]$/.test(atual.texto.at(-1))) {
    atual = { ini: w.start, fim: w.end, texto: [t] };
    linhas.push(atual);
  } else {
    atual.fim = w.end;
    atual.texto.push(t);
  }
}
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean);
const parecido = (a, b) => {
  const A = new Set(norm(a)), B = new Set(norm(b));
  if (A.size < 3 || B.size < 3) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / Math.min(A.size, B.size);
};
if (video) {
  for (const l of linhas) {
    const r = spawnSync("ffmpeg", ["-hide_banner", "-ss", String(l.ini), "-t", String(Math.max(0.3, l.fim - l.ini)), "-i", video,
      "-vn", "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" });
    l.db = Number(/mean_volume:\s+(-?[\d.]+) dB/.exec(r.stderr)?.[1]);
  }
}
const dbs = linhas.map((l) => l.db).filter(Number.isFinite).sort((a, b) => a - b);
const mediana = dbs.length ? dbs[Math.floor(dbs.length * 0.75)] : null; // referência = tomadas mais fortes (p75)

console.log(`# ${palavras.length} palavras, ${linhas.length} trechos (pausa > ${pausa}s)${mediana !== null ? `, volume de referência (p75) ${mediana} dB` : ""}\n`);
linhas.forEach((l, i) => {
  const texto = l.texto.join(" ");
  const repetidoDepois = linhas.slice(i + 1).findIndex((o) => parecido(texto, o.texto.join(" ")) >= 0.7);
  const marcas = [];
  if (repetidoDepois >= 0) marcas.push(`⟲ refeito no trecho ${i + 2 + repetidoDepois} (prefira a última tomada completa)`);
  if (mediana !== null && Number.isFinite(l.db) && l.db < mediana - 8) marcas.push(`🔉 ${l.db} dB, bem abaixo das tomadas boas: ensaio ou fala fora do microfone?`);
  const vol = Number.isFinite(l.db) ? ` [${l.db} dB]` : "";
  console.log(`${String(i + 1).padStart(3)}  ${l.ini.toFixed(2).padStart(7)}–${l.fim.toFixed(2).padEnd(7)}${vol} ${texto}${marcas.length ? "   " + marcas.join("  ") : ""}`);
});
const gaps = linhas.slice(1).map((l, i) => ({ de: linhas[i].fim, ate: l.ini, s: l.ini - linhas[i].fim })).filter((g) => g.s > 3);
if (gaps.length) {
  console.log("\n# Silêncios longos (> 3 s) — confira se há fala baixa ou conversa fora de cena:");
  for (const g of gaps) console.log(`  ${g.de.toFixed(2)}–${g.ate.toFixed(2)} (${g.s.toFixed(1)} s)`);
}
