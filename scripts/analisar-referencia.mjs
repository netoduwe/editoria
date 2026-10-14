#!/usr/bin/env node
// Mede um vídeo de referência e monta o "pacote de evidências" para copiar o estilo de edição.
// Uso: node scripts/analisar-referencia.mjs <video> [--saida <pasta>] [--idioma pt] [--max 180] [--sem-transcricao]
// Saída (padrão: <pasta do vídeo>/analise/): analise.json, analise.md, transcript.json e folhas/*.jpg
// O que é MEDIDO aqui (números) vira "medido" na receita; o que o agente vê nas folhas vira "observado".
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, readdirSync, renameSync, existsSync, rmSync } from "node:fs";
import { join, dirname, resolve, basename } from "node:path";

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
mkdirSync(join(folhas, "cortes"), { recursive: true });

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
// 5c. um quadro do meio de cada plano (5x4 = 20 planos por folha). Um seek por plano: exatamente 1 quadro cada,
// na ordem da tabela — sem risco de duplicar e deslocar a grade.
mkdirSync(join(folhas, "planos"), { recursive: true });
planos.forEach((p, i) => {
  ff(["-ss", ((p.inicio + p.fim) / 2).toFixed(3), "-i", video, "-frames:v", "1", "-an", "-vf", "scale=240:-2", join(folhas, "planos", `p_${String(i).padStart(3, "0")}.jpg`)]);
});
arquivos.planos = [];
for (let g = 0; g < planos.length; g += 20) {
  const n = Math.min(20, planos.length - g);
  const nome = `planos_${String(g + 1).padStart(3, "0")}-${String(g + n).padStart(3, "0")}.jpg`;
  ff(["-start_number", String(g), "-i", join(folhas, "planos", "p_%03d.jpg"), "-frames:v", String(n), "-vf", `tile=5x${Math.ceil(n / 5)}`, join(folhas, nome)]);
  arquivos.planos.push(nome);
}
rmSync(join(folhas, "planos"), { recursive: true, force: true });
// 5d. sequência de cada corte: 6 quadros a cada 0,1 s centrados no corte (tipo de transição)
const cortesFolha = cortesF.slice(0, 64);
cortesFolha.forEach((c, i) => {
  ff(["-ss", Math.max(0, c.t - 0.3).toFixed(3), "-i", video, "-t", "0.6", "-an", "-vf", "fps=10,scale=160:-2,tile=6x1", "-frames:v", "1", join(folhas, "cortes", `c_${String(i).padStart(3, "0")}.jpg`)]);
});
arquivos.cortes = [];
for (let g = 0; g < cortesFolha.length; g += 8) {
  const n = Math.min(8, cortesFolha.length - g);
  const nome = `cortes_${String(g + 1).padStart(3, "0")}-${String(g + n).padStart(3, "0")}.jpg`;
  ff(["-start_number", String(g), "-i", join(folhas, "cortes", "c_%03d.jpg"), "-vf", `tile=1x${n}`, "-frames:v", "1", join(folhas, nome)]);
  arquivos.cortes.push(nome);
}
rmSync(join(folhas, "cortes"), { recursive: true, force: true });

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

// ---------------------------------------------------------------- 7. saída
const analise = { tecnico, ritmo, movimento, cor, audio, cortes: cortesF, mudancas_leves: mudancasF.slice(0, 60), planos, picos_de_movimento: picosF,
  folhas: arquivos, transcricao: palavras.length ? "transcript.json" : null, gerado_em: new Date().toISOString() };
writeFileSync(join(out, "analise.json"), JSON.stringify(analise, null, 2));

const L = [];
L.push(`# Análise medida — ${basename(video)}`, "");
L.push(`**Técnico:** ${tecnico.resolucao} (${tecnico.formato}), ${tecnico.fps} fps, ${tecnico.duracao_s} s${D < DUR ? ` (analisados ${r2(D)} s)` : ""}.`);
L.push(`**Ritmo:** ${ritmo.cortes} cortes (${ritmo.cortes_por_minuto}/min) · plano médio ${ritmo.plano_medio_s} s (mediana ${ritmo.plano_mediano_s}, faixa ${ritmo.plano_min_s}–${ritmo.plano_max_s}) · ${ritmo.cortes_nos_3s_iniciais} corte(s) nos 3 s iniciais · ${ritmo.mudancas_leves} mudanças leves (zoom/elemento/gráfico — confira).`);
L.push(`**Movimento:** ${movimento.leitura}; ${movimento.picos_fora_de_corte} picos de animação/zoom fora dos cortes (${movimento.picos_por_minuto}/min).`);
L.push(`**Cor:** ${cor.leitura} · brilho ${cor.brilho_medio_0a255}/255 · contraste ${cor.contraste_mediano} · saturação ${cor.saturacao_media} · ${cor.quadros_claros_pct}% quadros claros, ${cor.quadros_escuros_pct}% escuros.`);
L.push(`**Paleta dominante (inclui o vídeo, não só os gráficos):** ${cor.paleta.map((p) => `${p.hex} ${p.participacao}%`).join(" · ")}`);
L.push(`**Cores de destaque (pixels saturados — textos, ícones, botões):** ${cor.destaques_saturados.map((p) => `${p.hex} ${p.participacao}%`).join(" · ") || "nenhuma: estilo neutro/monocromático"}`);
if (audio) {
  L.push(`**Áudio:** ${audio.loudness_lufs} LUFS · pico ${audio.pico_dbfs} dBFS · LRA ${audio.lra_lu} LU · cortes com batida sonora (whoosh/pop prováveis): ${audio.cortes_com_batida_sonora}.`);
  if (audio.fala) L.push(`**Fala:** ${audio.fala.palavras} palavras, ${audio.fala.palavras_por_minuto} ppm, começa em ${audio.fala.fala_comeca_em_s} s · ${audio.fala.pausas_por_minuto} pausas/min, mediana ${audio.fala.pausa_mediana_s} s, p90 ${audio.fala.pausa_p90_s} s → ${audio.fala.leitura_pausas}.`);
  L.push(`**Trilha:** ${audio.trilha.leitura}.`);
}
L.push("", "## Folhas para olhar (em `folhas/`)", "");
L.push(`- \`${arquivos.gancho}\` — os 3 primeiros segundos, 10 quadros por segundo; cada linha = 1 s. Como o vídeo prende nos primeiros instantes.`);
L.push(`- ${arquivos.segundos.map((f) => `\`${f}\``).join(", ")} — 1 quadro por segundo, 6 por linha, na ordem (o intervalo está no nome).`);
L.push(`- ${arquivos.planos.map((f) => `\`${f}\``).join(", ")} — 1 quadro do meio de cada plano, 5 por linha, na ordem da tabela de planos do analise.json. Catálogo de layouts.`);
L.push(`- ${arquivos.cortes.map((f) => `\`${f}\``).join(", ") || "(sem cortes)"} — cada linha é um corte: 6 quadros de 0,1 s centrados nele (o corte fica entre o 3º e o 4º). Tipo de transição.`);
for (const l of arquivos.legendas) L.push(`- \`${l.arquivo}\` — 4 s a 10 quadros/s; cada linha = 1 s. Falas nesse trecho: ${l.palavras || "(sem transcrição)"}`);
L.push("", "## Cortes (s)", "", cortesF.map((c) => c.t).join(" · ") || "nenhum");
L.push("", "## Picos de movimento fora dos cortes (s) — zooms, entradas de elementos, animações", "", picosF.map((p) => p.t).join(" · ") || "nenhum");
writeFileSync(join(out, "analise.md"), L.join("\n") + "\n");

console.log(`✓ análise pronta em ${out}`);
console.log(`  ${ritmo.cortes} cortes · plano médio ${ritmo.plano_medio_s} s · ${cor.leitura}${audio?.fala ? ` · ${audio.fala.palavras_por_minuto} ppm` : ""}`);
console.log(`  leia ${join(out, "analise.md")} e olhe as folhas em ${folhas}`);
