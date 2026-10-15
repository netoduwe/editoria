#!/usr/bin/env node
// Mede um vídeo de referência e monta o "pacote de evidências" para copiar o estilo de edição.
// Uso: node scripts/analisar-referencia.mjs <video> [--saida <pasta>] [--idioma pt] [--max 180] [--sem-transcricao]
// Saída (padrão: <pasta do vídeo>/analise/): analise.json, analise.md, transcript.json, folhas/*.jpg e folhas/picos/*_grade.png
// O que é MEDIDO aqui (números) vira "medido" na receita; o que o agente vê nas folhas vira "observado".
// Além de cortes, mede trocas de cena SEM corte (zoom/pan/whip/mergulho de câmera e fades), o tamanho dos textos
// nos picos (estimado, sem OCR) e o instante em que uma cor rara acende, cruzado com a palavra falada.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, readdirSync, renameSync, existsSync, rmSync } from "node:fs";
import { join, dirname, resolve, basename } from "node:path";
import { paraCadaQuadro, quadro as lerQuadro, movimentoGlobal, linhasDeTexto, descreverLinha } from "./_visao.mjs";

const args = process.argv.slice(2);
const flag = (k) => { const i = args.indexOf(k); return i >= 0 ? (args.splice(i, 1), true) : false; };
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const semTranscricao = flag("--sem-transcricao");
const saida = opt("--saida");
const idioma = opt("--idioma");
const maxS = Number(opt("--max") ?? 180);
const [video] = args;
if (!video || !existsSync(video)) {
  console.error("Uso: node scripts/analisar-referencia.mjs <video> [--saida pasta] [--idioma pt] [--max 180] [--sem-transcricao]");
  process.exit(1);
}
const out = saida ?? join(dirname(video), "analise");
const folhas = join(out, "folhas");
rmSync(folhas, { recursive: true, force: true });
mkdirSync(folhas, { recursive: true });

const run = (cmd, a, o = {}) => spawnSync(cmd, a, { encoding: "utf8", maxBuffer: 1024 * 1024 * 1024, ...o });
// npx no Windows exige shell; aspas protegem caminhos com espaço ("Meu Drive")
const npx = (a) => process.platform === "win32"
  ? run("npx", a.map((x) => (/[\s&()^|<>]/.test(x) ? `"${x}"` : x)), { shell: true })
  : run("npx", a);
const ff = (a) => run("ffmpeg", ["-hide_banner", "-v", "error", ...a]);
const r2 = (x, d = 2) => (x === null || x === undefined || Number.isNaN(x) ? null : Number(x.toFixed(d)));
const pct = (arr, p) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))]; };
const media = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
const passo = (msg) => console.log(`• ${msg}`);

// ffmpeg metadata=print → [{t, chave: valor}]
const lerMeta = (txt) => {
  const linhas = [];
  let cur = null;
  for (const l of txt.split(/\r?\n/)) {
    const f = /pts_time:([\d.]+)/.exec(l);
    if (l.startsWith("frame:") && f) { cur = { t: Number(f[1]) }; linhas.push(cur); continue; }
    const m = /^lavfi\.([\w.]+)=(-?[\d.]+)/.exec(l);
    if (m && cur) cur[m[1]] = Number(m[2]);
  }
  return linhas;
};

// ---------------------------------------------------------------- 1. técnico
passo("lendo o arquivo");
const probe = JSON.parse(run("ffprobe", ["-v", "error", "-show_format", "-show_streams", "-of", "json", video]).stdout || "{}");
const vs = probe.streams?.find((s) => s.codec_type === "video");
const as = probe.streams?.find((s) => s.codec_type === "audio");
if (!vs) { console.error("✗ arquivo sem vídeo"); process.exit(1); }
const rot = Math.abs(Number(vs.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? vs.tags?.rotate ?? 0));
const [W, H] = rot === 90 || rot === 270 ? [vs.height, vs.width] : [vs.width, vs.height];
const [fn, fd] = (vs.avg_frame_rate ?? "30/1").split("/").map(Number);
const FPS = fd ? fn / fd : 30;
const DUR = Number(probe.format.duration);
const D = Math.min(DUR, maxS);
const tecnico = { arquivo: video, duracao_s: r2(DUR), analisado_s: r2(D), resolucao: `${W}x${H}`, proporcao: r2(W / H, 3),
  formato: H > W ? "vertical" : H === W ? "quadrado" : "horizontal", fps: r2(FPS, 3), audio: !!as };

// ---------------------------------------------------------------- 2. cortes e planos
passo("detectando cortes");
const cena = lerMeta(ff(["-t", String(D), "-i", video, "-an", "-vf", "scale=270:-2,select=gte(scene\\,0),metadata=print:file=-", "-f", "null", "-"]).stdout);
const score = cena.map((c) => c.scene_score ?? 0);
const cortes = [];
const mudancas = [];
for (let i = 1; i < cena.length - 1; i++) {
  const s = score[i];
  if (s < score[i - 1] || s < score[i + 1]) continue;
  const viz = score.slice(Math.max(0, i - 15), i + 16).filter((_, j) => j !== Math.min(i, 15));
  const base = pct(viz, 0.5) ?? 0;
  if (s >= 0.3) cortes.push({ t: r2(cena[i].t, 3), score: r2(s, 3) });
  else if (s >= 0.1 && s > base * 6 + 0.02) mudancas.push({ t: r2(cena[i].t, 3), score: r2(s, 3) });
}
const juntar = (lista, gap) => lista.reduce((acc, c) => {
  const ult = acc.at(-1);
  if (ult && c.t - ult.t < gap) { if (c.score > ult.score) acc[acc.length - 1] = c; } else acc.push(c);
  return acc;
}, []);
const cortesF = juntar(cortes, 0.2);
const mudancasF = juntar(mudancas, 0.25).filter((m) => !cortesF.some((c) => Math.abs(c.t - m.t) < 0.25));
const limites = [0, ...cortesF.map((c) => c.t), D];
const planos = limites.slice(0, -1).map((ini, i) => ({ n: i + 1, inicio: r2(ini, 3), fim: r2(limites[i + 1], 3), duracao: r2(limites[i + 1] - ini, 3) }));
const durs = planos.map((p) => p.duracao);
const ritmo = {
  cortes: cortesF.length, cortes_por_minuto: r2(cortesF.length / (D / 60), 1),
  plano_medio_s: r2(media(durs)), plano_mediano_s: r2(pct(durs, 0.5)), plano_min_s: r2(Math.min(...durs)), plano_max_s: r2(Math.max(...durs)),
  plano_p25_s: r2(pct(durs, 0.25)), plano_p75_s: r2(pct(durs, 0.75)),
  cortes_nos_3s_iniciais: cortesF.filter((c) => c.t < 3).length, primeiro_corte_s: cortesF[0]?.t ?? null,
  mudancas_leves: mudancasF.length,
};

// ---------------------------------------------------------------- 3. movimento / animação
passo("medindo movimento");
const dif = lerMeta(ff(["-t", String(D), "-i", video, "-an", "-vf", "scale=160:-2,format=gray,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-", "-f", "null", "-"]).stdout)
  .map((d) => ({ t: d.t, y: d["signalstats.YAVG"] ?? 0 }));
const pertoDeCorte = (t, j = 0.15) => cortesF.some((c) => Math.abs(c.t - t) <= j);
const difSemCorte = dif.filter((d) => !pertoDeCorte(d.t, 2.5 / FPS)).map((d) => d.y);
const movMed = pct(difSemCorte, 0.5) ?? 0;
const picos = [];
for (let i = 1; i < dif.length - 1; i++) {
  const y = dif[i].y;
  if (y < dif[i - 1].y || y < dif[i + 1].y || pertoDeCorte(dif[i].t)) continue;
  if (y > Math.max(movMed * 4, movMed + 5)) picos.push({ t: r2(dif[i].t, 3), score: r2(y, 2) });
}
const picosF = juntar(picos, 0.3).sort((a, b) => b.score - a.score).slice(0, 40).sort((a, b) => a.t - b.t);
const porSeg = [];
for (let s = 0; s < Math.ceil(D); s++) porSeg.push(r2(media(dif.filter((d) => d.t >= s && d.t < s + 1).map((d) => d.y)) ?? 0, 1));
const movimento = {
  diferenca_mediana: r2(movMed), diferenca_p90: r2(pct(difSemCorte, 0.9)),
  leitura: movMed < 1 ? "câmera fixa e quadro estável" : movMed < 3 ? "movimento leve (respiração, gestos, push lento)" : "muito movimento (câmera na mão, b-roll ou animação constante)",
  picos_fora_de_corte: picosF.length, picos_por_minuto: r2(picosF.length / (D / 60), 1), atividade_por_segundo: porSeg,
};

// ---------------------------------------------------------------- 3b. câmera: trocas de cena SEM corte
// Movimento global entre quadros seguidos (casamento de blocos → zoom, pan, giro): separa câmera parada, push lento,
// whip (pan/zoom rápido que leva de um enquadramento a outro), mergulho (zoom forte para dentro de uma região) e fade.
passo("medindo movimento de câmera (zoom, pan, whip, fade)");
const FA = Math.max(8, Math.min(15, Math.round(FPS)));
const LW = 160, LH = Math.max(2, Math.round((LW * H) / W / 2) * 2);
const temCorte = (a, b) => cortesF.some((c) => c.t > a - 0.02 && c.t <= b + 0.02);
const passos = [], brilhos = [];
let anterior = null;
paraCadaQuadro(video, { fps: FA, largura: LW, altura: LH, ate: D }, (q, t) => {
  let s = 0, s2 = 0;
  for (let i = 0; i < q.length; i++) { s += q[i]; s2 += q[i] * q[i]; }
  brilhos.push({ t, media: s / q.length, dp: Math.sqrt(Math.max(0, s2 / q.length - (s / q.length) ** 2)) });
  if (anterior) {
    const corte = temCorte(anterior.t, t);
    passos.push({ t: (anterior.t + t) / 2, corte, m: corte ? null : movimentoGlobal(anterior.q, q, LW, LH) });
  }
  anterior = { q, t };
});
// fades: o contraste cai (ou sobe) aos poucos até (ou a partir de) uma tela lisa
const liso = (b) => b.dp < 10;
const nomeCor = (m) => (m > 200 ? "branco" : m < 50 ? "preto" : "cor lisa");
const fades = [];
for (let i = 0; i < brilhos.length; i++) {
  if (!liso(brilhos[i]) || (i > 0 && liso(brilhos[i - 1]))) continue;
  let j = i;
  while (j + 1 < brilhos.length && liso(brilhos[j + 1])) j++;
  const c = nomeCor(brilhos[i].media);
  let a = i;
  while (a > 0 && brilhos[a - 1].dp > brilhos[a].dp * 1.03 && !temCorte(brilhos[a - 1].t, brilhos[a].t)) a--;
  if (i - a >= 2 && brilhos[a].dp > 2.5 * brilhos[i].dp) fades.push({ tipo: `fade para ${c}`, inicio: r2(brilhos[a].t, 3), fim: r2(brilhos[i].t, 3) });
  let b = j;
  while (b + 1 < brilhos.length && brilhos[b + 1].dp > brilhos[b].dp * 1.03 && !temCorte(brilhos[b].t, brilhos[b + 1].t)) b++;
  if (b - j >= 2 && brilhos[b].dp > 2.5 * brilhos[j].dp) fades.push({ tipo: `entrada a partir de tela ${c === "branco" ? "branca" : c === "preto" ? "preta" : "lisa"}`, inicio: r2(brilhos[j].t, 3), fim: r2(brilhos[b].t, 3) });
}
// cada passo: confiável quando a maioria dos blocos segue o mesmo movimento
const difAlta = (t) => dif.some((d) => Math.abs(d.t - t) <= 0.5 / FA + 0.5 / FPS && d.y > Math.max(movMed * 4, movMed + 5));
for (const p of passos) {
  const m = p.m;
  p.fade = fades.some((f) => p.t >= f.inicio - 0.5 / FA && p.t <= f.fim + 0.5 / FA);
  p.conf = !!m && m.blocos >= 8 && m.confianca >= 0.5;
  p.zoom = m ? (Math.min(2, Math.max(0.5, m.escala)) ** FA - 1) * 100 : 0; // % por segundo
  p.pan = m ? Math.hypot(m.tx, m.ty) * FA * 100 : 0;                       // % da largura por segundo
  p.rapido = !p.corte && !p.fade && ((p.conf && (Math.abs(p.zoom) >= 25 || p.pan >= 25)) || (!p.conf && difAlta(p.t)));
  p.movendo = p.conf && (Math.abs(p.zoom) >= 6 || p.pan >= 6);
}
// trechos rápidos (aceita 1 passo de falha no meio) estendidos pela aceleração e frenagem
const transicoes = [];
for (let i = 0; i < passos.length; i++) {
  if (!passos[i].rapido) continue;
  let j = i;
  for (;;) {
    if (j + 1 < passos.length && passos[j + 1].rapido) j++;
    else if (j + 2 < passos.length && !passos[j + 1].corte && passos[j + 2].rapido) j += 2;
    else break;
  }
  let a = i, b = j;
  while (a > 0 && passos[a - 1].movendo && !passos[a - 1].corte) a--;
  while (b + 1 < passos.length && passos[b + 1].movendo && !passos[b + 1].corte) b++;
  const trecho = passos.slice(a, b + 1);
  i = b;
  if (!trecho.some((p) => p.conf && p.rapido) && trecho.filter((p) => p.rapido).length < 2) continue; // só borrão isolado: não dá para afirmar
  // passos com borrão entram na soma se ainda houver algum casamento (estimativa)
  const usaveis = trecho.filter((p) => p.m && p.m.blocos >= 6 && p.m.confianca >= 0.1);
  const escala = Math.exp(usaveis.reduce((s, p) => s + Math.log(Math.min(2, Math.max(0.5, p.m.escala))), 0));
  const panX = usaveis.reduce((s, p) => s + p.m.tx, 0), panY = usaveis.reduce((s, p) => s + p.m.ty, 0) * (LW / LH); // fração da largura / da altura
  const k = escala - 1;
  const centro = Math.abs(k) > 0.05 ? { x: 0.5 - panX / k, y: 0.5 - panY / k } : null; // ponto para onde a câmera vai (0–1)
  const centroDentro = !!centro && centro.x >= -0.1 && centro.x <= 1.1 && centro.y >= -0.1 && centro.y <= 1.1;
  const panPct = Math.max(Math.abs(panX), Math.abs(panY)) * 100;
  const dir = Math.abs(panY) > Math.abs(panX) ? (panY < 0 ? "para baixo" : "para cima") : panX < 0 ? "para a direita" : "para a esquerda";
  const zoomForte = escala >= 1.2 || escala <= 1 / 1.2;
  if (!zoomForte && panPct < 15) continue; // pulso, tremida ou animação de elemento: não leva a outro enquadramento
  const tipo = zoomForte && (centroDentro || panPct < 15) ? (escala > 1 ? "whip-zoom (mergulho)" : "whip-zoom para fora (recuo)")
    : zoomForte ? `whip pan ${dir} + zoom ${escala > 1 ? "in" : "out"}` : `whip pan ${dir}`;
  const ini = trecho[0].t - 0.5 / FA, fim = trecho.at(-1).t + 0.5 / FA;
  transicoes.push({
    inicio: r2(ini, 3), fim: r2(fim, 3), duracao_s: r2(fim - ini, 2), tipo,
    escala_total: r2(escala, 2), pan_pct: { x: r2(-panX * 100, 1), y: r2(-panY * 100, 1) }, // direção da CÂMERA, em % do quadro
    centro_pct: centroDentro ? { x: r2(centro.x * 100, 0), y: r2(centro.y * 100, 0) } : null,
    mergulho: centroDentro && (escala >= 1.5 || (escala >= 1.3 && trecho.some((p) => !p.conf))),
    velocidade_max: r2(Math.max(0, ...trecho.filter((p) => p.conf).map((p) => Math.max(Math.abs(p.zoom), p.pan))), 0),
    estimado: trecho.some((p) => !p.conf), // houve borrão: escala e pan são aproximados
  });
}
// cenas = trechos entre cortes e trocas por câmera; em cada uma, mede push/pan lento entre o começo e o fim estáveis
const eventos = [...cortesF.map((c) => ({ inicio: c.t, fim: c.t })), ...transicoes].sort((a, b) => a.inicio - b.inicio);
const cenas = [];
let desde = 0;
for (const e of [...eventos, { inicio: D, fim: D }]) {
  if (e.inicio - desde > 0.05) cenas.push({ n: cenas.length + 1, inicio: r2(desde, 3), fim: r2(e.inicio, 3), duracao: r2(e.inicio - desde, 3) });
  desde = e.fim;
}
const ML = 320, MLH = Math.max(2, Math.round((ML * H) / W / 2) * 2);
for (const c of cenas.filter((x) => x.duracao >= 1.2).sort((x, y) => y.duracao - x.duracao).slice(0, 40)) {
  let a = c.inicio + 0.1, b = c.fim - 0.1;
  for (const f of fades) { if (f.fim <= a || f.inicio >= b) continue; if (f.inicio + f.fim < a + b) a = Math.max(a, f.fim + 0.05); else b = Math.min(b, f.inicio - 0.05); }
  if (b - a < 1) continue;
  const m = movimentoGlobal(lerQuadro(video, a, ML, MLH), lerQuadro(video, b, ML, MLH), ML, MLH, { alcance: 12, maxBlocos: 64 });
  if (m.confianca < 0.3) { c.camera = "inconclusivo (o conteúdo muda muito)"; continue; }
  const dur = b - a, zoomTot = (m.escala - 1) * 100, panTot = Math.hypot(m.tx, m.ty * (W / H)) * 100;
  c.camera_medida = { de: r2(a, 2), ate: r2(b, 2), zoom_pct: r2(zoomTot, 1), zoom_pct_por_s: r2(zoomTot / dur, 2), pan_pct: r2(panTot, 1) };
  c.camera = Math.abs(zoomTot) >= 1.5 && Math.abs(zoomTot) / dur >= 0.4 ? `${zoomTot > 0 ? "push-in lento" : "recuo lento"} (escala ×${m.escala.toFixed(3)} em ${dur.toFixed(1)} s, ${(zoomTot / dur).toFixed(1)}%/s)`
    : panTot >= 3 && panTot / dur >= 0.5 ? `pan lento (${panTot.toFixed(1)}% do quadro em ${dur.toFixed(1)} s)` : "parada";
}
for (const p of picosF) {
  const tr = transicoes.find((x) => p.t >= x.inicio && p.t <= x.fim), fd = fades.find((x) => p.t >= x.inicio - 0.5 / FA && p.t <= x.fim + 0.5 / FA);
  p.tipo = tr ? `câmera: ${tr.tipo}` : fd ? fd.tipo : "entrada/troca de elemento na tela";
}
const tiposCam = [...new Set(transicoes.map((x) => (x.tipo.startsWith("whip-zoom") ? "whip-zoom" : "whip-pan")))];
const camera = {
  transicao_tipo: !transicoes.length ? (cortesF.length ? "cortes" : "plano único") : !cortesF.length
    ? ["camera_continua", ...tiposCam, ...(transicoes.some((x) => x.mergulho) ? ["mergulho"] : [])].join(" / ")
    : `misto: ${cortesF.length} cortes + ${transicoes.length} trocas por movimento de câmera`,
  transicoes, transicoes_por_minuto: r2(transicoes.length / (D / 60), 1), fades, cenas,
};
ritmo.trocas_por_camera = transicoes.length;
ritmo.cenas = cenas.length;
ritmo.cena_media_s = r2(media(cenas.map((c) => c.duracao)));
const lentas = cenas.filter((c) => /lento/.test(c.camera ?? ""));
if (transicoes.length || lentas.length) {
  movimento.leitura = [
    transicoes.length ? `câmera em movimento: ${transicoes.length} troca(s) de cena sem corte (${tiposCam.join(", ")})` : null,
    lentas.length ? `${lentas.map((c) => `cena ${c.n}: ${c.camera}`).join("; ")}` : null,
    `fora disso, ${movMed < 1 ? "quadro estável" : movMed < 3 ? "movimento leve" : "muito movimento"}`,
  ].filter(Boolean).join("; ");
}

// ---------------------------------------------------------------- 4. cor
passo("medindo cor");
const st = lerMeta(ff(["-t", String(D), "-i", video, "-an", "-vf", "fps=2,scale=180:-2,signalstats,metadata=print:file=-", "-f", "null", "-"]).stdout);
const Y = st.map((s) => s["signalstats.YAVG"]).filter(Number.isFinite);
const sat = st.map((s) => s["signalstats.SATAVG"]).filter(Number.isFinite);
const contr = st.map((s) => s["signalstats.YHIGH"] - s["signalstats.YLOW"]).filter(Number.isFinite);
const temp = st.map((s) => s["signalstats.VAVG"] - s["signalstats.UAVG"]).filter(Number.isFinite);
const rgb = spawnSync("ffmpeg", ["-hide_banner", "-v", "error", "-t", String(D), "-i", video, "-an", "-vf", "fps=1,scale=96:96:flags=area,format=rgb24", "-f", "rawvideo", "-"], { maxBuffer: 1024 * 1024 * 1024 }).stdout;
// k-means determinístico (sementes por quantis de luminância) → [{hex, participacao%}]
const hex = (v) => "#" + v.map((x) => Math.round(x).toString(16).padStart(2, "0")).join("").toUpperCase();
const kmeans = (px, k, total) => {
  const n = Math.floor(px.length / 3);
  if (n < k) return [];
  const lum = (i) => 0.2126 * px[i * 3] + 0.7152 * px[i * 3 + 1] + 0.0722 * px[i * 3 + 2];
  const m = Math.min(n, 4000);
  const amostra = Array.from({ length: m }, (_, j) => Math.floor((j * n) / m)).sort((x, y) => lum(x) - lum(y));
  let c = Array.from({ length: k }, (_, j) => { const i = amostra[Math.floor(((j + 0.5) * m) / k)]; return [px[i * 3], px[i * 3 + 1], px[i * 3 + 2]]; });
  const rot = new Uint8Array(n);
  for (let it = 0; it < 12; it++) {
    const soma = Array.from({ length: k }, () => [0, 0, 0, 0]);
    for (let i = 0; i < n; i++) {
      let best = 0, bd = Infinity;
      for (let j = 0; j < k; j++) {
        const d = (px[i * 3] - c[j][0]) ** 2 + (px[i * 3 + 1] - c[j][1]) ** 2 + (px[i * 3 + 2] - c[j][2]) ** 2;
        if (d < bd) { bd = d; best = j; }
      }
      rot[i] = best;
      const sm = soma[best]; sm[0] += px[i * 3]; sm[1] += px[i * 3 + 1]; sm[2] += px[i * 3 + 2]; sm[3]++;
    }
    c = soma.map((sm, j) => (sm[3] ? [sm[0] / sm[3], sm[1] / sm[3], sm[2] / sm[3]] : c[j]));
  }
  const cont = new Array(k).fill(0);
  for (let i = 0; i < n; i++) cont[rot[i]]++;
  const fundidos = [];
  for (const g of c.map((v, j) => ({ v, n: cont[j] })).filter((g) => g.n > 0).sort((x, y) => y.n - x.n)) {
    const perto = fundidos.find((f) => Math.hypot(f.v[0] - g.v[0], f.v[1] - g.v[1], f.v[2] - g.v[2]) < 24);
    if (perto) perto.n += g.n; else fundidos.push({ ...g });
  }
  return fundidos.map((g) => ({ hex: hex(g.v), participacao: r2((100 * g.n) / (total ?? n), 2) }));
};
const paleta = kmeans(rgb, 8);
// cores de destaque: só pixels bem saturados (texto colorido, ícones, botões), em resolução maior para não perder traço fino.
// Saturação HSV > 0,5 tira a maior parte da pele; ainda pode sobrar roupa/objeto colorido — confirme nas folhas.
const rgbAlta = spawnSync("ffmpeg", ["-hide_banner", "-v", "error", "-t", String(D), "-i", video, "-an", "-vf", "fps=1,scale=160:-2:flags=area,format=rgb24", "-f", "rawvideo", "-"], { maxBuffer: 1024 * 1024 * 1024 }).stdout;
const saturados = [];
for (let i = 0; i + 2 < rgbAlta.length; i += 3) {
  const mx = Math.max(rgbAlta[i], rgbAlta[i + 1], rgbAlta[i + 2]), mn = Math.min(rgbAlta[i], rgbAlta[i + 1], rgbAlta[i + 2]);
  if (mx > 80 && (mx - mn) / mx > 0.5) saturados.push(rgbAlta[i], rgbAlta[i + 1], rgbAlta[i + 2]);
}
const destaques = kmeans(Uint8Array.from(saturados), 6, Math.floor(rgbAlta.length / 3)).filter((d) => d.participacao >= 0.03);
const brilho = media(Y);
const cor = {
  brilho_medio_0a255: r2(brilho, 1), contraste_mediano: r2(pct(contr, 0.5), 1), saturacao_media: r2(media(sat), 1),
  temperatura: r2(media(temp), 1),
  leitura: [
    brilho > 150 ? "imagem clara" : brilho < 70 ? "imagem escura" : "brilho médio",
    media(sat) > 40 ? "cores saturadas" : media(sat) < 15 ? "cores lavadas/neutras" : "saturação moderada",
    media(temp) > 3 ? "puxada para o quente" : media(temp) < -3 ? "puxada para o frio" : "temperatura neutra",
  ].join(", "),
  quadros_claros_pct: r2((100 * Y.filter((y) => y > 170).length) / Math.max(1, Y.length), 1),
  quadros_escuros_pct: r2((100 * Y.filter((y) => y < 60).length) / Math.max(1, Y.length), 1),
  paleta,
  destaques_saturados: destaques,
};

// ---------------------------------------------------------------- 5. folhas de quadros
passo("montando folhas de quadros");
const arquivos = {};
// 5a. um quadro por segundo (6x2 = 12 s por folha)
ff(["-t", String(D), "-i", video, "-an", "-vf", "fps=1,scale=240:-2,tile=6x2", "-start_number", "0", join(folhas, "seg_%02d.jpg")]);
arquivos.segundos = readdirSync(folhas).filter((f) => f.startsWith("seg_")).sort().map((f, i) => {
  const nome = `segundos_${String(i * 12).padStart(3, "0")}-${String(Math.min(i * 12 + 11, Math.ceil(D) - 1)).padStart(3, "0")}s.jpg`;
  renameSync(join(folhas, f), join(folhas, nome));
  return nome;
});
// 5b. gancho: 3 primeiros segundos a 10 quadros/s (cada linha = 1 s)
ff(["-t", String(Math.min(3, D)), "-i", video, "-an", "-vf", "fps=10,scale=180:-2,tile=10x3", "-frames:v", "1", join(folhas, "gancho_0-3s_10qps.jpg")]);
arquivos.gancho = "gancho_0-3s_10qps.jpg";
// 5c. um quadro por instante (5x4 = 20 por folha). Um seek por quadro: exatamente 1 quadro cada, na ordem —
// sem risco de duplicar e deslocar a grade.
const folhaDeInstantes = (tempos, prefixo) => {
  const tmp = join(folhas, `_${prefixo}`);
  mkdirSync(tmp, { recursive: true });
  tempos.forEach((t, i) => ff(["-ss", t.toFixed(3), "-i", video, "-frames:v", "1", "-an", "-vf", "scale=240:-2", join(tmp, `p_${String(i).padStart(3, "0")}.jpg`)]));
  const nomes = [];
  for (let g = 0; g < tempos.length; g += 20) {
    const n = Math.min(20, tempos.length - g);
    const nome = `${prefixo}_${String(g + 1).padStart(3, "0")}-${String(g + n).padStart(3, "0")}.jpg`;
    ff(["-start_number", String(g), "-i", join(tmp, "p_%03d.jpg"), "-frames:v", String(n), "-vf", `tile=5x${Math.ceil(n / 5)}`, join(folhas, nome)]);
    nomes.push(nome);
  }
  rmSync(tmp, { recursive: true, force: true });
  return nomes;
};
// 5d. sequência centrada em cada instante: 6 quadros a cada 0,1 s (o instante fica entre o 3º e o 4º), 8 por folha
const folhaDeSequencias = (tempos, prefixo) => {
  const tmp = join(folhas, `_${prefixo}`);
  mkdirSync(tmp, { recursive: true });
  tempos.forEach((t, i) => ff(["-ss", Math.max(0, t - 0.3).toFixed(3), "-i", video, "-t", "0.6", "-an", "-vf", "fps=10,scale=160:-2,tile=6x1", "-frames:v", "1", join(tmp, `c_${String(i).padStart(3, "0")}.jpg`)]));
  const nomes = [];
  for (let g = 0; g < tempos.length; g += 8) {
    const n = Math.min(8, tempos.length - g);
    const nome = `${prefixo}_${String(g + 1).padStart(3, "0")}-${String(g + n).padStart(3, "0")}.jpg`;
    ff(["-start_number", String(g), "-i", join(tmp, "c_%03d.jpg"), "-vf", `tile=1x${n}`, "-frames:v", "1", join(folhas, nome)]);
    nomes.push(nome);
  }
  rmSync(tmp, { recursive: true, force: true });
  return nomes;
};
arquivos.planos = folhaDeInstantes(planos.map((p) => (p.inicio + p.fim) / 2), "planos");
// com trocas por câmera, os planos (entre cortes) escondem as cenas: uma folha com 1 quadro de cada cena
arquivos.cenas = transicoes.length ? folhaDeInstantes(cenas.map((c) => (c.inicio + c.fim) / 2), "cenas") : [];
arquivos.cortes = folhaDeSequencias(cortesF.slice(0, 64).map((c) => c.t), "cortes");
arquivos.picos = folhaDeSequencias(picosF.slice(0, 40).map((p) => p.t), "picos");

// ---------------------------------------------------------------- 6. fala e áudio
let audio = null, palavras = [];
if (as) {
  passo("medindo áudio");
  const eb = run("ffmpeg", ["-hide_banner", "-t", String(D), "-i", video, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr;
  const resumo = eb.slice(eb.lastIndexOf("Summary:"));
  audio = { loudness_lufs: r2(Number(/I:\s+(-?[\d.]+) LUFS/.exec(resumo)?.[1]), 1), lra_lu: r2(Number(/LRA:\s+(-?[\d.]+) LU/.exec(resumo)?.[1]), 1),
    pico_dbfs: r2(Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(resumo)?.[1]), 1) };

  if (!semTranscricao) {
    passo("transcrevendo (local)");
    const tr = npx(["--yes", "hyperframes", "transcribe", resolve(video), "--json", "--dir", resolve(out), ...(idioma ? ["--language", idioma] : [])]);
    const jsonLinha = (tr.stdout || "").trim().split(/\r?\n/).reverse().find((l) => l.startsWith("{"));
    const res = jsonLinha ? JSON.parse(jsonLinha) : null;
    const caminho = res?.transcriptPath ?? join(out, "transcript.json");
    if (res?.ok && existsSync(caminho)) palavras = JSON.parse(readFileSync(caminho, "utf8")).filter((w) => (w.text ?? "").trim() && w.start < D);
    else console.log("  (transcrição indisponível — rode `npx hyperframes models install parakeet`)");
  }

  const pcm = spawnSync("ffmpeg", ["-hide_banner", "-v", "error", "-t", String(D), "-i", video, "-vn", "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], { maxBuffer: 1024 * 1024 * 1024 }).stdout;
  const amostras = new Int16Array(new Uint8Array(pcm).buffer, 0, Math.floor(pcm.length / 2)); // cópia alinhada
  const jan = 800; // 50 ms
  const db = [];
  for (let i = 0; i + jan <= amostras.length; i += jan) {
    let s = 0;
    for (let j = i; j < i + jan; j++) s += amostras[j] * amostras[j];
    db.push(20 * Math.log10(Math.sqrt(s / jan) / 32768 + 1e-9));
  }
  const tj = (i) => i * 0.05;
  const naFala = (t) => palavras.some((w) => t >= w.start - 0.05 && t <= w.end + 0.05);
  const onsets = [];
  for (let i = 3; i < db.length; i++) if (db[i] > -40 && db[i] - Math.min(db[i - 1], db[i - 2], db[i - 3]) > 12) onsets.push(r2(tj(i), 2));
  const onsetsF = onsets.filter((t, i) => i === 0 || t - onsets[i - 1] > 0.15);
  const inicioDePalavra = (t) => palavras.some((w) => Math.abs(w.start - t) < 0.12);
  const sfxCortes = cortesF.filter((c) => onsetsF.some((o) => Math.abs(o - c.t) < 0.12) && !inicioDePalavra(c.t)).length;
  audio.batidas_fora_da_fala = onsetsF.filter((t) => !naFala(t)).slice(0, 40);
  audio.cortes_com_batida_sonora = `${sfxCortes} de ${cortesF.length}`;

  if (palavras.length > 3) {
    // Pausas e trilha medidas pelo VOLUME dentro do trecho falado (não dependem do transcritor,
    // que às vezes emenda o fim de uma palavra no início da seguinte).
    const i0 = Math.floor(palavras[0].start / 0.05), i1 = Math.min(db.length, Math.ceil(palavras.at(-1).end / 0.05));
    const regiao = db.slice(i0, i1);
    const voz = pct(regiao, 0.75);
    const limite = voz - 15;
    const pausas = [];   // duração de cada trecho abaixo do limite
    const miolos = [];   // volume no miolo das pausas longas (sem o rabo da palavra anterior)
    let corrida = [];
    const fecha = () => {
      const dur = corrida.length * 0.05;
      if (dur >= 0.1) pausas.push(dur);
      if (dur >= 0.25) miolos.push(...corrida.slice(1, -1));
      corrida = [];
    };
    for (const v of regiao) { if (v < limite) corrida.push(v); else fecha(); }
    fecha();
    const minFala = (palavras.at(-1).end - palavras[0].start) / 60;
    const p90 = pct(pausas, 0.9) ?? 0;
    audio.fala = {
      palavras: palavras.length, palavras_por_minuto: r2(palavras.length / minFala, 0), fala_comeca_em_s: r2(palavras[0].start),
      pausas_por_minuto: r2(pausas.length / minFala, 1), pausa_mediana_s: r2(pct(pausas, 0.5) ?? 0), pausa_p90_s: r2(p90), pausa_max_s: r2(Math.max(0, ...pausas)),
      leitura_pausas: pausas.length / minFala < 4
        ? "inconclusivo: quase nenhuma pausa detectada (fundo ruidoso/trilha alta ou fala corrida) — confira ouvindo"
        : p90 < 0.2 ? "corte seco: quase nenhuma respiração entre frases" : p90 < 0.45 ? "respiros curtos (corte apertado, mas natural)" : "pausas longas mantidas (ritmo calmo)",
    };
    const pisoLongas = pct(miolos, 0.5);
    const delta = pisoLongas === null ? null : voz - pisoLongas;
    audio.trilha = {
      voz_db: r2(voz, 1), piso_entre_falas_db: pisoLongas === null ? null : r2(pisoLongas, 1), diferenca_db: delta === null ? null : r2(delta, 1),
      pausas_longas_medidas: miolos.length ? `${miolos.length * 0.05} s` : "nenhuma",
      leitura: pisoLongas === null ? "inconclusivo: quase não há pausas de 0,25 s+ para medir (corte muito seco ou fundo ruidoso) — veja se há música creditada ou ouça"
        : pisoLongas < -55 ? "silêncio real nas pausas: sem trilha sob a voz"
        : delta <= 30 ? `som contínuo nas pausas ~${Math.round(delta)} dB abaixo da voz: provável trilha ou ambiente`
        : `fundo bem baixo nas pausas (~${Math.round(delta)} dB abaixo da voz): trilha discreta ou ruído de sala`,
    };
  } else {
    audio.fala = null;
    audio.trilha = { leitura: "pouca ou nenhuma fala: provavelmente vídeo guiado por música/efeitos" };
  }
}

// 5e. janelas densas para legendas (10 quadros/s, 4 s), onde há fala
arquivos.legendas = [];
for (const frac of [0.35, 0.7]) {
  let t0 = D * frac;
  const w = palavras.find((p) => p.start >= t0);
  if (w) t0 = Math.max(0, w.start - 0.2);
  t0 = Math.min(t0, Math.max(0, D - 4));
  const nome = `legendas_${t0.toFixed(1)}-${(t0 + 4).toFixed(1)}s_10qps.jpg`;
  ff(["-ss", t0.toFixed(3), "-i", video, "-t", "4", "-an", "-vf", "fps=10,scale=200:-2,tile=10x4", "-frames:v", "1", join(folhas, nome)]);
  arquivos.legendas.push({ arquivo: nome, inicio_s: r2(t0), palavras: palavras.filter((p) => p.start >= t0 && p.start < t0 + 4).map((p) => `${p.text}@${p.start.toFixed(2)}`).join(" ") });
}

// ---------------------------------------------------------------- 6b. cor rara × fala (acento cromático)
// Em vídeo quase sem cor, o instante em que uma cor saturada acende costuma ser a palavra-ápice: cruza com a transcrição.
passo("cruzando cor de destaque com a fala");
const FC = Math.min(10, FA), CW = 160, CH = Math.max(2, Math.round((CW * H) / W / 2) * 2);
const corT = [];
paraCadaQuadro(video, { fps: FC, largura: CW, altura: CH, formato: "rgb24", ate: D }, (q, t) => {
  let n = 0, sr = 0, sg = 0, sb = 0, x0 = CW, y0 = CH, x1 = -1, y1 = -1;
  for (let i = 0, p = 0; i < q.length; i += 3, p++) {
    const r = q[i], g = q[i + 1], b = q[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx > 80 && (mx - mn) / mx > 0.5) {
      n++; sr += r; sg += g; sb += b;
      const x = p % CW, y = (p - x) / CW;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  corT.push({ t, f: n / (CW * CH), hex: n ? hex([sr / n, sg / n, sb / n]) : null, caixa: n ? { x: x0 / CW, y: y0 / CH, l: (x1 - x0 + 1) / CW, a: (y1 - y0 + 1) / CH } : null });
});
const LIM = 0.0005; // 0,05% do quadro
const fracComCor = corT.length ? corT.filter((c) => c.f >= LIM).length / corT.length : 0;
const acentos = [];
if (corT.length && fracComCor <= 0.5 && cor.saturacao_media < 20) {
  for (let i = 0; i < corT.length; i++) {
    if (corT[i].f < LIM) continue;
    if (corT.slice(Math.max(0, i - Math.round(0.3 * FC)), i).some((c) => c.f >= LIM / 2)) continue; // ainda é o mesmo acento
    let j = i; // dura até 0,3 s seguidos sem a cor
    while (j + 1 < corT.length && corT.slice(j + 1, j + 1 + Math.round(0.3 * FC)).some((c) => c.f >= LIM / 2)) j++;
    const janela = corT.slice(i, Math.min(corT.length, i + FC));
    const meio = Math.max(LIM, 0.75 * Math.max(...janela.map((c) => c.f))); // piscada: cai abaixo de 3/4 do pico e volta
    let trocas = 0;
    for (let k = 1; k < janela.length; k++) if ((janela[k].f >= meio) !== (janela[k - 1].f >= meio)) trocas++;
    const pico = corT.slice(i, j + 1).reduce((m, c) => (c.f > m.f ? c : m));
    const t = corT[i].t;
    const perto = palavras.filter((w) => w.start >= t - 0.6 && w.start <= t + 0.3).sort((x, y) => Math.abs(x.start - t) - Math.abs(y.start - t))[0]
      ?? palavras.find((w) => t >= w.start && t <= w.end);
    const area = pico.caixa.l * pico.caixa.a;
    acentos.push({
      t: r2(t, 2), ate: r2(corT[j].t, 2), cor: pico.hex, area_pct: r2(pico.f * 100, 2),
      posicao_pct: { x: r2((pico.caixa.x + pico.caixa.l / 2) * 100, 0), y: r2((pico.caixa.y + pico.caixa.a / 2) * 100, 0), largura: r2(pico.caixa.l * 100, 0), altura: r2(pico.caixa.a * 100, 0) },
      palavra: perto ? { texto: perto.text, inicio: r2(perto.start, 2) } : null,
      pisca: trocas >= 3 ? `entra piscando (${trocas} trocas em 1 s): glitch/flicker — confira na folha` : null,
      localizado: area < 0.25,
    });
  }
}
const alertas = [];
for (const x of acentos.filter((a) => a.localizado)) {
  alertas.push(x.palavra
    ? `Destaque cromático cirúrgico na palavra-ápice '${x.palavra.texto}' aos ${x.t}s (fala em ${x.palavra.inicio}s) — ${x.cor}, x ${x.posicao_pct.x}% y ${x.posicao_pct.y}%${x.pisca ? `, ${x.pisca}` : ""}`
    : `Acento de cor ${x.cor} aos ${x.t}s sem palavra falada perto (elemento gráfico?) — x ${x.posicao_pct.x}% y ${x.posicao_pct.y}%`);
}
if (camera.transicao_tipo.startsWith("camera_continua")) alertas.push(`Sem cortes: as ${transicoes.length} trocas de cena são movimentos de câmera (${tiposCam.join(", ")}) — reproduza com câmera virtual contínua, nunca com corte seco`);
for (const x of transicoes.filter((t) => t.mergulho)) alertas.push(`Mergulho aos ${x.inicio}s: zoom ${x.estimado ? "≥ " : ""}×${x.escala_total} para dentro de x ${x.centro_pct.x}% y ${x.centro_pct.y}% do quadro — confira nas folhas se a câmera entra num elemento do cenário (tela, lousa, foto): aí é mergulho diegético`);
for (const x of fades) alertas.push(`${x.tipo[0].toUpperCase()}${x.tipo.slice(1)} de ${x.inicio}s a ${x.fim}s`);

// ---------------------------------------------------------------- 6c. quadros de medição com grade + tipografia
// Picos (imagem já assentada depois do movimento), perto do fim de cada cena (texto acumulado)
// e o instante de cada acento de cor. Tamanho do texto estimado pela geometria (sem OCR): confira na grade.
passo("salvando quadros dos picos com grade e medindo os textos");
mkdirSync(join(folhas, "picos"), { recursive: true });
const tg = (t) => t.toFixed(2).replace(".", "s");
const limAssenta = Math.max(movMed * 2, movMed + 2);
const assenta = (t) => { const d = dif.find((x) => x.t > t + 1.5 / FPS && x.t <= t + 0.7 && x.y < limAssenta); return Math.min(D - 0.05, d ? d.t + 0.5 / FPS : t + 0.3); };
const medidas = [];
[...picosF].sort((x, y) => y.score - x.score).slice(0, 16).sort((x, y) => x.t - y.t)
  .forEach((p, i) => medidas.push({ origem: "pico", n: i + 1, pico_s: p.t, t: r2(assenta(p.t), 3), tipo: p.tipo }));
// fim de cada cena (as 8 mais longas): o texto já acumulou; recua para antes de um fade de saída
const fimDaCena = (c) => { let t = c.fim - Math.max(0.15, 0.15 * c.duracao); for (const f of fades) if (t >= f.inicio - 0.05 && t <= f.fim) t = f.inicio - 0.1; return Math.max(c.inicio, t); };
[...cenas].sort((x, y) => y.duracao - x.duracao).slice(0, 8).forEach((c) => medidas.push({ origem: "cena", n: c.n, t: r2(fimDaCena(c), 3) }));
acentos.forEach((x, i) => medidas.push({ origem: "cor", n: i + 1, t: r2(Math.min(D - 0.05, x.t + 0.35), 3) }));
const usadas = [];
for (const m of medidas) if (!usadas.some((u) => Math.abs(u.t - m.t) < 0.2) && usadas.length < 24) usadas.push(m);
const lado = Math.max(W, H), MW = lado > 1920 ? Math.round((W * 1920) / lado / 2) * 2 : W, MH = lado > 1920 ? Math.round((H * 1920) / lado / 2) * 2 : H;
for (const m of usadas) {
  m.arquivo = m.origem === "pico" ? `picos/pico_${String(m.n).padStart(2, "0")}_${tg(m.pico_s)}_quadro_${tg(m.t)}_grade.png`
    : m.origem === "cena" ? `picos/cena_${String(m.n).padStart(2, "0")}_fim_${tg(m.t)}_grade.png` : `picos/cor_${String(m.n).padStart(2, "0")}_${tg(m.t)}_grade.png`;
  ff(["-ss", m.t.toFixed(3), "-i", video, "-frames:v", "1", "-an", "-vf", `scale=${MW}:${MH},drawgrid=w=iw/10:h=ih/10:t=1:c=0xFF00FF@0.55,drawgrid=w=iw/2:h=ih/2:t=3:c=0xFF00FF@0.8`, join(folhas, m.arquivo)]);
  const rgbQ = lerQuadro(video, m.t, MW, MH, "rgb24");
  m.texto = rgbQ?.length === MW * MH * 3 ? linhasDeTexto(rgbQ, MW, MH).map((l) => descreverLinha(l, MW, MH)) : [];
}
usadas.sort((x, y) => x.t - y.t);
const porClasse = new Map();
for (const l of usadas.flatMap((m) => m.texto)) { if (!porClasse.has(l.classe)) porClasse.set(l.classe, []); porClasse.get(l.classe).push(l); }
const tipografia = [...porClasse.entries()].map(([classe, ls]) => {
  const alt = ls.map((l) => l.altura_maiusculas_px).sort((x, y) => x - y), em = ls.map((l) => l.em_1080.altura_maiusculas_px).sort((x, y) => x - y);
  return { classe, linhas: ls.length, altura_maiusculas_px: { min: alt[0], mediana: pct(alt, 0.5), max: alt.at(-1) },
    pct_lado_menor_mediana: pct(ls.map((l) => l.altura_pct_lado_menor), 0.5), em_1080_corpo_css_px: Math.round(pct(em, 0.5) / 0.72),
    pesos: [...new Set(ls.map((l) => l.peso))], cores: [...new Set(ls.map((l) => l.cor))].slice(0, 4) };
}).sort((x, y) => y.altura_maiusculas_px.mediana - x.altura_maiusculas_px.mediana);

// ---------------------------------------------------------------- 7. saída
cor.acentos = acentos;
cor.quadros_com_cor_saturada_pct = r2(fracComCor * 100, 1);
arquivos.quadros_com_grade = usadas.map((m) => m.arquivo);
const analise = { tecnico, ritmo, movimento, camera, cor, audio, alerta_estilo: alertas, cortes: cortesF, mudancas_leves: mudancasF.slice(0, 60), planos,
  picos_de_movimento: picosF, quadros_medidos: usadas, tipografia, folhas: arquivos, transcricao: palavras.length ? "transcript.json" : null, gerado_em: new Date().toISOString() };
writeFileSync(join(out, "analise.json"), JSON.stringify(analise, null, 2));

const L = [];
L.push(`# Análise medida — ${basename(video)}`, "");
L.push(`**Técnico:** ${tecnico.resolucao} (${tecnico.formato}), ${tecnico.fps} fps, ${tecnico.duracao_s} s${D < DUR ? ` (analisados ${r2(D)} s)` : ""}.`);
L.push(`**Ritmo:** ${ritmo.cortes} cortes (${ritmo.cortes_por_minuto}/min) + ${ritmo.trocas_por_camera} trocas de cena por câmera → ${ritmo.cenas} cena(s), cena média ${ritmo.cena_media_s} s · plano médio ${ritmo.plano_medio_s} s (mediana ${ritmo.plano_mediano_s}, faixa ${ritmo.plano_min_s}–${ritmo.plano_max_s}) · ${ritmo.cortes_nos_3s_iniciais} corte(s) nos 3 s iniciais · ${ritmo.mudancas_leves} mudanças leves (zoom/elemento/gráfico — confira).`);
L.push(`**Movimento:** ${movimento.leitura}; ${movimento.picos_fora_de_corte} picos de animação/zoom fora dos cortes (${movimento.picos_por_minuto}/min).`);
L.push(`**Transição (transicao_tipo):** ${camera.transicao_tipo}.`);
L.push(`**Cor:** ${cor.leitura} · brilho ${cor.brilho_medio_0a255}/255 · contraste ${cor.contraste_mediano} · saturação ${cor.saturacao_media} · ${cor.quadros_claros_pct}% quadros claros, ${cor.quadros_escuros_pct}% escuros.`);
L.push(`**Paleta dominante (inclui o vídeo, não só os gráficos):** ${cor.paleta.map((p) => `${p.hex} ${p.participacao}%`).join(" · ")}`);
L.push(`**Cores de destaque (pixels saturados — textos, ícones, botões):** ${cor.destaques_saturados.map((p) => `${p.hex} ${p.participacao}%`).join(" · ") || "nenhuma: estilo neutro/monocromático"}`);
if (audio) {
  L.push(`**Áudio:** ${audio.loudness_lufs} LUFS · pico ${audio.pico_dbfs} dBFS · LRA ${audio.lra_lu} LU · cortes com batida sonora (whoosh/pop prováveis): ${audio.cortes_com_batida_sonora}.`);
  if (audio.fala) L.push(`**Fala:** ${audio.fala.palavras} palavras, ${audio.fala.palavras_por_minuto} ppm, começa em ${audio.fala.fala_comeca_em_s} s · ${audio.fala.pausas_por_minuto} pausas/min, mediana ${audio.fala.pausa_mediana_s} s, p90 ${audio.fala.pausa_p90_s} s → ${audio.fala.leitura_pausas}.`);
  L.push(`**Trilha:** ${audio.trilha.leitura}.`);
}
if (alertas.length) L.push("", "## Alertas de estilo (alerta_estilo)", "", ...alertas.map((a) => `- ${a}`));
if (transicoes.length || fades.length) {
  L.push("", "## Câmera e trocas de cena sem corte", "", "| De–até (s) | Tipo | Escala | Câmera anda (% do quadro) | Vai para (x, y) | Vel. máx. |", "|---|---|---|---|---|---|");
  for (const x of transicoes) L.push(`| ${x.inicio}–${x.fim} | ${x.tipo}${x.estimado ? " (borrão: aproximado)" : ""} | ${x.estimado && x.escala_total > 1 ? "≥ " : ""}×${x.escala_total} | x ${x.pan_pct.x} · y ${x.pan_pct.y} | ${x.centro_pct ? `${x.centro_pct.x}%, ${x.centro_pct.y}%` : "—"} | ${x.velocidade_max}%/s |`);
  for (const x of fades) L.push(`| ${x.inicio}–${x.fim} | ${x.tipo} | | | | |`);
  L.push("", "**Cenas** (entre cortes e trocas por câmera; movimento medido entre o começo e o fim estáveis de cada uma):", "");
  for (const c of cenas) L.push(`- cena ${c.n}: ${c.inicio}–${c.fim} s (${c.duracao} s) · câmera: ${c.camera ?? "curta demais para medir"}`);
}
if (acentos.length) {
  L.push("", "## Acentos de cor no tempo", "", `Cor saturada em só ${cor.quadros_com_cor_saturada_pct}% dos quadros: cada vez que uma cor acende é uma escolha.`, "");
  for (const x of acentos) L.push(`- ${x.t}–${x.ate} s · ${x.cor} · ${x.area_pct}% do quadro em x ${x.posicao_pct.x}% y ${x.posicao_pct.y}%${x.palavra ? ` · palavra: "${x.palavra.texto}" (${x.palavra.inicio} s)` : ""}${x.pisca ? ` · ${x.pisca}` : ""}`);
}
if (usadas.length) {
  const fmtCorpo = (v) => (Array.isArray(v) ? `${v[0]}–${v[1]}` : v);
  L.push("", "## Texto na tela (estimado nos quadros com grade, sem OCR)", "",
    `Altura das maiúsculas em px do quadro analisado (${MW}×${MH}) e em % do lado menor. Classes: hero/estatística ≥ 12% · título 6–12% · legenda 3–6% · rótulo < 3%. "Em 1080" = mesma proporção num quadro com 1080 px no lado menor (ex.: 1080×1920) — no vertical, a linha precisa caber em 820 px (zona segura x 110–930); corpo CSS ≈ maiúscula ÷ 0,72 (faixa quando a linha só tem minúsculas). Confira cada linha na grade.`, "");
  for (const m of usadas) {
    const de = m.origem === "pico" ? `pico ${m.pico_s} s (${m.tipo})` : m.origem === "cena" ? `fim da cena ${m.n}` : `acento de cor ${m.n}`;
    L.push(`- **${m.t} s** — ${de} · \`${m.arquivo}\``);
    for (const l of m.texto) L.push(`  - ${l.classe}: maiúscula ${l.altura_maiusculas_px} px (${l.altura_pct_lado_menor}%) · em 1080: ${l.em_1080.altura_maiusculas_px} px (linha com ${l.em_1080.largura_px} px de largura), corpo ≈ ${fmtCorpo(l.em_1080.corpo_css_px)} px · ${l.peso} · ${l.cor} ${l.polaridade} · centro x ${l.centro_pct.x}% y ${l.centro_pct.y}%`);
    if (!m.texto.length) L.push("  - (nenhuma linha de texto detectada)");
  }
  if (tipografia.length) {
    L.push("", "**Hierarquia medida:**", "");
    for (const c of tipografia) L.push(`- ${c.classe}: ${c.linhas} linha(s), maiúscula ${c.altura_maiusculas_px.min}–${c.altura_maiusculas_px.max} px (mediana ${c.altura_maiusculas_px.mediana}, ${c.pct_lado_menor_mediana}% do lado menor) → em 1080 corpo ≈ ${c.em_1080_corpo_css_px} px · ${c.pesos.join(", ")} · ${c.cores.join(" ")}`);
  }
}
L.push("", "## Folhas para olhar (em `folhas/`)", "", "**Obrigatório abrir e olhar antes de escrever a receita**: os números acima não mostram layout, textura, profundidade de campo nem o que está escrito.", "");
L.push(`- \`${arquivos.gancho}\` — os 3 primeiros segundos, 10 quadros por segundo; cada linha = 1 s. Como o vídeo prende nos primeiros instantes.`);
L.push(`- ${arquivos.segundos.map((f) => `\`${f}\``).join(", ")} — 1 quadro por segundo, 6 por linha, na ordem (o intervalo está no nome).`);
L.push(`- ${arquivos.planos.map((f) => `\`${f}\``).join(", ")} — 1 quadro do meio de cada plano, 5 por linha, na ordem da tabela de planos do analise.json. Catálogo de layouts.`);
if (arquivos.cenas.length) L.push(`- ${arquivos.cenas.map((f) => `\`${f}\``).join(", ")} — 1 quadro do meio de cada **cena** (cortes + trocas por câmera), na ordem da lista de cenas. Use esta, não a de planos, para o catálogo de layouts.`);
L.push(`- ${arquivos.cortes.map((f) => `\`${f}\``).join(", ") || "(sem cortes)"} — cada linha é um corte: 6 quadros de 0,1 s centrados nele (o corte fica entre o 3º e o 4º). Tipo de transição.`);
L.push(`- ${arquivos.picos.map((f) => `\`${f}\``).join(", ") || "(sem picos)"} — cada linha é um pico de movimento: 6 quadros de 0,1 s centrados nele. Whip, mergulho, entrada de texto, glitch.`);
if (usadas.length) L.push("- `picos/*_grade.png` — quadro inteiro com grade (finas a cada 10%, grossas no meio) depois de cada pico, no fim de cada cena e em cada acento de cor: posição e tamanho dos textos.");
for (const l of arquivos.legendas) L.push(`- \`${l.arquivo}\` — 4 s a 10 quadros/s; cada linha = 1 s. Falas nesse trecho: ${l.palavras || "(sem transcrição)"}`);
L.push("", "## Cortes (s)", "", cortesF.map((c) => c.t).join(" · ") || "nenhum");
L.push("", "## Picos de movimento fora dos cortes (s) — zooms, entradas de elementos, animações", "", picosF.map((p) => `${p.t} (${p.tipo})`).join(" · ") || "nenhum");
writeFileSync(join(out, "analise.md"), L.join("\n") + "\n");

console.log(`✓ análise pronta em ${out}`);
console.log(`  ${ritmo.cortes} cortes + ${ritmo.trocas_por_camera} trocas por câmera · ${camera.transicao_tipo} · ${cor.leitura}${audio?.fala ? ` · ${audio.fala.palavras_por_minuto} ppm` : ""}`);
for (const a of alertas) console.log(`  ⚑ ${a}`);
console.log(`  leia ${join(out, "analise.md")} e olhe as folhas em ${folhas}`);
