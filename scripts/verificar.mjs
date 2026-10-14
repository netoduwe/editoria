#!/usr/bin/env node
// Confere um vídeo: formato, orientação real, fps, duração, áudio, loudness e erros de decodificação.
// Gera uma folha de quadros para revisar de relance: ao lado do vídeo quando ele está em projetos/ ou saida/;
// para vídeos de entrada/ (ou de fora do kit) vai para projetos/_folhas/ — a entrada nunca é tocada.
// Uso: node scripts/verificar.mjs <video> [--rapido]   (--rapido pula a decodificação completa)
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { basename, join, relative, isAbsolute } from "node:path";

const [video, flag] = process.argv.slice(2);
if (!video) { console.error("Uso: node scripts/verificar.mjs <video> [--rapido]"); process.exit(1); }
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
if (flag !== "--rapido") {
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

console.log(JSON.stringify(info, null, 2));
