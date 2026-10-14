#!/usr/bin/env node
// Compara a análise da REFERÊNCIA com a do TESTE reproduzido e diz o que ajustar.
// Uso: node scripts/comparar-analises.mjs <referencia/analise/analise.json> <teste/analise/analise.json>
import { readFileSync } from "node:fs";

const [aRef, aTeste] = process.argv.slice(2);
if (!aRef || !aTeste) { console.error("Uso: node scripts/comparar-analises.mjs <ref/analise.json> <teste/analise.json>"); process.exit(1); }
const R = JSON.parse(readFileSync(aRef, "utf8"));
const T = JSON.parse(readFileSync(aTeste, "utf8"));
const get = (o, p) => p.split(".").reduce((x, k) => (x == null ? null : x[k]), o);
const razao = (s) => { const m = /^(\d+) de (\d+)$/.exec(s ?? ""); return m && Number(m[2]) ? Number(m[1]) / Number(m[2]) : null; };

// [rótulo, caminho, tipo de tolerância, tolerância, dica quando o teste está ACIMA, dica quando ABAIXO]
const regras = [
  ["Duração média do plano (s)", "ritmo.plano_medio_s", "rel", 0.25, "planos longos demais: corte mais ou troque de layout com mais frequência", "cortando demais: segure mais cada plano"],
  ["Cortes por minuto", "ritmo.cortes_por_minuto", "rel", 0.25, "cortes demais", "cortes de menos: aumente trocas de plano/layout"],
  ["Cortes nos 3 s iniciais", "ritmo.cortes_nos_3s_iniciais", "abs", 1, "gancho agitado demais", "gancho parado: acelere as trocas no início"],
  ["Animações/zooms por minuto", "movimento.picos_por_minuto", "rel", 0.35, "animação demais", "animação de menos: mais entradas de elementos/punch-ins"],
  ["Movimento de base", "movimento.diferenca_mediana", "rel", 0.6, "quadro agitado demais (zoom contínuo/câmera)", "quadro parado demais: push lento ou leve movimento"],
  ["Brilho (0–255)", "cor.brilho_medio_0a255", "abs", 20, "imagem mais clara que a referência", "imagem mais escura que a referência"],
  ["Contraste", "cor.contraste_mediano", "abs", 25, "contraste maior", "contraste menor"],
  ["Saturação", "cor.saturacao_media", "abs", 8, "cores mais saturadas", "cores mais lavadas"],
  ["Temperatura (+quente/−fria)", "cor.temperatura", "abs", 4, "mais quente", "mais fria"],
  ["% quadros claros", "cor.quadros_claros_pct", "abs", 20, "fundos claros demais", "faltam cenas de fundo claro"],
  ["% quadros escuros", "cor.quadros_escuros_pct", "abs", 20, "fundos escuros demais", "faltam cenas de fundo escuro"],
  ["Loudness (LUFS)", "audio.loudness_lufs", "abs", 1.5, "mais alto", "mais baixo: masterize"],
  ["Pausas p90 (s)", "audio.fala.pausa_p90_s", "abs", 0.15, "respiros longos: corte as pausas mais curtas", "corte seco demais: deixe respirar"],
  ["Pausas por minuto", "audio.fala.pausas_por_minuto", "rel", 0.4, "mais pausas que a referência: aperte os cortes de silêncio", "menos pausas que a referência: fala mais corrida"],
  ["Trilha: voz − fundo (dB)", "audio.trilha.diferenca_db", "abs", 6, "trilha mais baixa que a referência", "trilha mais alta que a referência"],
];

const linhas = [];
let ok = 0, total = 0;
const dicas = [];
for (const [rot, cam, tipo, tol, acima, abaixo] of regras) {
  const r = get(R, cam), t = get(T, cam);
  if (typeof r !== "number" || typeof t !== "number") { linhas.push(`| ${rot} | ${r ?? "—"} | ${t ?? "—"} | | (sem dado) |`); continue; }
  const dif = t - r;
  const dentro = tipo === "rel" ? Math.abs(dif) <= Math.abs(r) * tol + 1e-9 : Math.abs(dif) <= tol;
  total++; if (dentro) ok++; else dicas.push(`- **${rot}:** ${dif > 0 ? acima : abaixo} (ref ${r} · teste ${t})`);
  linhas.push(`| ${rot} | ${r} | ${t} | ${dif > 0 ? "+" : ""}${Number(dif.toFixed(2))} | ${dentro ? "✓" : "✗"} |`);
}
// batida sonora nas trocas
const br = razao(get(R, "audio.cortes_com_batida_sonora")), bt = razao(get(T, "audio.cortes_com_batida_sonora"));
if (br !== null && bt !== null) {
  const dentro = Math.abs(bt - br) <= 0.25; total++; if (dentro) ok++;
  else dicas.push(`- **SFX nas trocas:** ${bt > br ? "efeitos sonoros demais nos cortes" : "faltam whoosh/pop nos cortes"} (ref ${Math.round(br * 100)}% · teste ${Math.round(bt * 100)}%)`);
  linhas.push(`| Cortes com batida sonora | ${Math.round(br * 100)}% | ${Math.round(bt * 100)}% | | ${dentro ? "✓" : "✗"} |`);
}
// cores de destaque: cada destaque da referência tem um parecido no teste?
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const dRef = (get(R, "cor.destaques_saturados") ?? []).slice(0, 3), dTes = get(T, "cor.destaques_saturados") ?? [];
for (const d of dRef) {
  const [r1, g1, b1] = hexRgb(d.hex);
  const perto = dTes.map((x) => { const [r2, g2, b2] = hexRgb(x.hex); return { x, dist: Math.hypot(r1 - r2, g1 - g2, b1 - b2) }; }).sort((a, b) => a.dist - b.dist)[0];
  const dentro = perto && perto.dist < 70; total++; if (dentro) ok++;
  linhas.push(`| Destaque ${d.hex} | presente | ${perto ? `${perto.x.hex} (dist. ${Math.round(perto.dist)})` : "—"} | | ${dentro ? "✓" : "✗ (ok se a marca do aluno troca essa cor)"} |`);
}

console.log(`# Referência × teste — ${ok}/${total} dentro da tolerância\n`);
console.log("| Métrica | Referência | Teste | Diferença | |\n|---|---|---|---|---|");
console.log(linhas.join("\n"));
console.log(`\nInformativo (depende da pessoa, não da edição): ppm ref ${get(R, "audio.fala.palavras_por_minuto") ?? "—"} · teste ${get(T, "audio.fala.palavras_por_minuto") ?? "—"}; formato ref ${get(R, "tecnico.resolucao")} · teste ${get(T, "tecnico.resolucao")}.`);
console.log(dicas.length
  ? `\n## O que ajustar\n${dicas.join("\n")}\n\nPara cada item decida: ERRO de reprodução (corrija a receita/composição) ou ADAPTAÇÃO intencional (marca ou material do aluno — registre em "Adaptações" na receita).`
  : "\n✓ Números dentro do estilo. Confira agora a comparação visual lado a lado.");
