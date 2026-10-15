#!/usr/bin/env node
// Confere um vídeo: formato, orientação real, fps, duração, áudio, loudness e erros de decodificação.
// Gera uma folha de quadros para revisar de relance: ao lado do vídeo quando ele está em projetos/ ou saida/;
// para vídeos de entrada/ (ou de fora do kit) vai para projetos/_folhas/ — a entrada nunca é tocada.
// Uso: node scripts/verificar.mjs <video> [--rapido] [--guias]
//   --rapido pula a decodificação completa
//   --guias  gera também <video>.guias.jpg: 8 quadros em tamanho de celular com a faixa segura desenhada
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { basename, join, relative, isAbsolute } from "node:path";

const args = process.argv.slice(2);
const video = args.find((a) => !a.startsWith("--")), flags = new Set(args.filter((a) => a.startsWith("--")));
if (!video) { console.error("Uso: node scripts/verificar.mjs <video> [--rapido] [--guias]"); process.exit(1); }
const run = (cmd, args) => spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

const probe = JSON.parse(run("ffprobe", ["-v", "error", "-show_format", "-show_streams", "-of", "json", video]).stdout || "{}");
if (!probe.format) { console.error(`✗ não consegui ler ${video}`); process.exit(1); }
const v = probe.streams.find((s) => s.codec_type === "video");
const a = probe.streams.find((s) => s.codec_type === "audio");
const rot = Math.abs(Number(v?.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? v?.tags?.rotate ?? 0));
const [w, h] = rot === 90 || rot === 270 ? [v.height, v.width] : [v?.width, v?.height];
const [fn, fd] = (v?.avg_frame_rate ?? "0/1").split("/").map(Number);
const dur = Number(probe.format.duration);
const info = {
  arquivo: video,
  duracao_s: Number(dur.toFixed(2)),
  resolucao_exibida: `${w}x${h}`,
  orientacao: h > w ? "vertical" : h === w ? "quadrado" : "horizontal",
  rotacao_graus: rot,
  fps: fd ? Number((fn / fd).toFixed(3)) : null,
  video_codec: v?.codec_name,
  audio: a ? `${a.codec_name} ${a.sample_rate} Hz ${a.channels} canal(is)` : "sem áudio",
};

if (a) {
  const eb = run("ffmpeg", ["-hide_banner", "-i", video, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr;
  const resumo = eb.slice(eb.lastIndexOf("Summary:"));
  info.loudness_lufs = Number(/I:\s+(-?[\d.]+) LUFS/.exec(resumo)?.[1]);
  info.pico_dbfs = Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(resumo)?.[1]);
}
if (!flags.has("--rapido")) {
  const dec = run("ffmpeg", ["-v", "error", "-i", video, "-f", "null", "-"]);
  info.decodificacao = dec.stderr.trim() ? `ERROS: ${dec.stderr.trim().split("\n").slice(0, 3).join(" | ")}` : "ok";
}
const rel = relative(process.cwd(), video);
const podeEscreverAoLado = !rel.startsWith("..") && !isAbsolute(rel) && /^(projetos|saida)[\\/]/.test(rel);
const pastaFolha = podeEscreverAoLado ? null : join("projetos", "_folhas");
if (pastaFolha) mkdirSync(pastaFolha, { recursive: true });
const folha = pastaFolha ? join(pastaFolha, basename(video).replace(/\.[^.]+$/, "") + ".folha.jpg") : video.replace(/\.[^.]+$/, "") + ".folha.jpg";
const n = 12, tw = h > w ? 216 : 384;
run("ffmpeg", ["-v", "error", "-y", "-i", video, "-vf", `fps=${n}/${Math.max(dur, 1)},scale=${tw}:-2,tile=6x2`, "-frames:v", "1", folha]);
info.folha_de_quadros = folha;

// Folha de revisão: tamanho de celular (270 px de largura) com a faixa segura do kit (x 110–930, y 470–1430).
if (flags.has("--guias")) {
  const tw2 = h >= w ? 270 : 480, th2 = Math.round((tw2 * h) / w / 2) * 2, k = tw2 / w;
  const reels = h > w && Math.abs(h / w - 16 / 9) < 0.02;
  const [bx, by, bw, bh] = (reels ? [110 * k, 470 * k, 820 * k, 960 * k] : [tw2 * 0.05, th2 * 0.05, tw2 * 0.9, th2 * 0.9]).map(Math.round);
  const guias = folha.replace(/.folha.jpg$/, ".guias.jpg");
  run("ffmpeg", ["-v", "error", "-y", "-i", video, "-vf",
    `fps=8/${Math.max(dur, 1)},scale=${tw2}:${th2},drawbox=x=${bx}:y=${by}:w=${bw}:h=${bh}:color=red@0.85:t=2,tile=8x1:padding=4:color=white`, "-frames:v", "1", guias]);
  info.folha_com_guias = guias;
}

// Alertas só para entregas (projetos/ e saida/): bruto de celular tem outro fps/resolução e tudo bem.
if (podeEscreverAoLado) {
  const alertas = [];
  if (!a) alertas.push("sem faixa de áudio");
  if (info.fps && Math.abs(info.fps - 30) > 0.05 && Math.abs(info.fps - 60) > 0.05) alertas.push(`${info.fps} fps (o kit entrega em 30)`);
  if (h > w && (w !== 1080 || h !== 1920)) alertas.push(`resolução ${w}x${h} (Reels: 1080x1920)`);
  if (Number.isFinite(info.loudness_lufs) && Math.abs(info.loudness_lufs + 14) > 1.5) alertas.push(`loudness ${info.loudness_lufs} LUFS (alvo −14: rode masterizar.mjs)`);
  if (Number.isFinite(info.pico_dbfs) && info.pico_dbfs > -1) alertas.push(`pico ${info.pico_dbfs} dBTP (máximo −1)`);
  info.alertas = alertas;
}

console.log(JSON.stringify(info, null, 2));
