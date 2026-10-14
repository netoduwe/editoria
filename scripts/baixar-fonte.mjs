#!/usr/bin/env node
// Baixa uma fonte livre (Google Fonts e outras open source, via Fontsource) para fontes/, com a licença.
// Uso: node scripts/baixar-fonte.mjs "<Família>" [pesos=400,700] [--italico]
// Ex.: node scripts/baixar-fonte.mjs "Montserrat" 800,900
//      node scripts/baixar-fonte.mjs "Playfair Display" 700 --italico
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const italico = args.includes("--italico");
const [familia, pesosArg] = args.filter((a) => a !== "--italico");
if (!familia) { console.error('Uso: node scripts/baixar-fonte.mjs "<Família>" [pesos=400,700] [--italico]'); process.exit(1); }
const slug = familia.trim().toLowerCase().replace(/\s+/g, "-");
const pesos = (pesosArg ?? "400,700").split(",").map((p) => p.trim());
const estilo = italico ? "italic" : "normal";
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
// CDN às vezes responde 503: tenta de novo e cai para o unpkg
const baixar = async (caminho, tipo = "json") => {
  for (const cdn of ["https://cdn.jsdelivr.net/npm", "https://unpkg.com"]) {
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const r = await fetch(`${cdn}/@fontsource/${slug}@${versao}/${caminho}`).catch(() => null);
      if (r?.ok) return tipo === "json" ? r.json() : tipo === "texto" ? r.text() : Buffer.from(await r.arrayBuffer());
      if (r && r.status === 404) break;
      await espera(800 * (tentativa + 1));
    }
  }
  return null;
};
const versao = await fetch(`https://registry.npmjs.org/@fontsource/${slug}/latest`).then((r) => (r.ok ? r.json() : null)).then((j) => j?.version).catch(() => null);
const meta = versao ? await baixar("metadata.json") : null;
if (!meta) {
  console.error(`✗ "${familia}" não está no Fontsource (nome exato como no Google Fonts?). Veja https://fontsource.org`);
  process.exit(1);
}
mkdirSync("fontes", { recursive: true });
const disponiveis = (meta.weights ?? []).map(String);
const baixadas = [];
for (const p of pesos) {
  if (!disponiveis.includes(p)) { console.log(`  peso ${p} não existe nessa família (disponíveis: ${disponiveis.join(", ")})`); continue; }
  if (italico && !(meta.styles ?? []).includes("italic")) { console.log("  essa família não tem itálico"); break; }
  const caminho = `files/${slug}-latin-${p}-${estilo}.woff2`; // "latin" cobre todos os acentos do português
  const dados = await baixar(caminho, "binario");
  if (!dados) { console.log(`  ✗ não consegui baixar ${caminho}`); continue; }
  const arq = join("fontes", `${slug}-${p}${italico ? "-italic" : ""}.woff2`);
  writeFileSync(arq, dados);
  baixadas.push(arq);
}
const licNome = typeof meta.license === "object" ? (meta.license?.type ?? meta.license?.id ?? "") : (meta.license ?? "");
const lic = await baixar("LICENSE", "texto");
if (lic) writeFileSync(join("fontes", `LICENCA-${slug}.txt`), lic);
if (!baixadas.length) { console.error("✗ nenhuma fonte baixada"); process.exit(1); }
console.log(`✓ ${meta.family}: ${baixadas.join(", ")}${lic ? ` · licença em fontes/LICENCA-${slug}.txt (${licNome || "ver arquivo"})` : ""}`);
console.log(`  CSS: @font-face{font-family:"${meta.family}";src:url("assets/fonts/${slug}-${pesos[0]}${italico ? "-italic" : ""}.woff2") format("woff2");font-weight:${pesos[0]};${italico ? "font-style:italic;" : ""}}`);
