#!/usr/bin/env node
// Nivela o áudio do vídeo final para redes sociais (-14 LUFS, pico -1 dBTP) sem reencodar a imagem.
// Uso: node scripts/masterizar.mjs <render.mp4> <final.mp4>
import { spawnSync } from "node:child_process";

const [entrada, saida] = process.argv.slice(2);
if (!entrada || !saida || entrada === saida) {
  console.error("Uso: node scripts/masterizar.mjs <render.mp4> <final.mp4>   (arquivos diferentes)");
  process.exit(1);
}
const alvo = "I=-14:TP=-1:LRA=11";
const medir = spawnSync("ffmpeg", ["-hide_banner", "-i", entrada, "-vn", "-af", `loudnorm=${alvo}:print_format=json`, "-f", "null", "-"], { encoding: "utf8" });
const txt = medir.stderr ?? "";
const json = txt.slice(txt.lastIndexOf("{"), txt.lastIndexOf("}") + 1);
if (!json) { console.error("Não consegui medir o áudio (o vídeo tem áudio?)"); process.exit(1); }
const m = JSON.parse(json);
const filtro = `loudnorm=${alvo}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}` +
  `:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", entrada, "-map", "0:v", "-map", "0:a", "-c:v", "copy",
  "-af", filtro, "-ar", "48000", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", saida], { stdio: "inherit" });
if (r.status !== 0) process.exit(r.status ?? 1);
console.log(`✓ áudio masterizado: ${saida} (antes ${m.input_i} LUFS → alvo -14 LUFS)`);
