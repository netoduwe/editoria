#!/usr/bin/env node
// Nivela o áudio do vídeo final para redes sociais (-14 LUFS, pico ≤ -1 dBTP) sem reencodar a imagem.
// Mira -1.5 dBTP e confere o arquivo pronto: a compressão AAC sobe o pico, e música masterizada alta sobe mais.
// Se o pico final passar de -1 dBTP, refaz com mais folga (até 3 vezes).
// Uso: node scripts/masterizar.mjs <render.mp4> <final.mp4>
import { spawnSync } from "node:child_process";

const [entrada, saida] = process.argv.slice(2);
if (!entrada || !saida || entrada === saida) {
  console.error("Uso: node scripts/masterizar.mjs <render.mp4> <final.mp4>   (arquivos diferentes)");
  process.exit(1);
}

function medir(arquivo, alvo) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-i", arquivo, "-vn", "-af", `loudnorm=${alvo}:print_format=json`, "-f", "null", "-"], { encoding: "utf8" });
  const txt = r.stderr ?? "";
  const json = txt.slice(txt.lastIndexOf("{"), txt.lastIndexOf("}") + 1);
  return json ? JSON.parse(json) : null;
}

let tp = -1.5, m = null, final = null;
for (let tentativa = 0; tentativa < 3; tentativa++, tp -= 0.8) {
  const alvo = `I=-14:TP=${tp.toFixed(1)}:LRA=11`;
  m = medir(entrada, alvo);
  if (!m) { console.error("Não consegui medir o áudio (o vídeo tem áudio?)"); process.exit(1); }
  const filtro = `loudnorm=${alvo}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}` +
    `:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", entrada, "-map", "0:v", "-map", "0:a", "-c:v", "copy",
    "-af", filtro, "-ar", "48000", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", saida], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
  final = medir(saida, "I=-14:TP=-1:LRA=11");
  if (final && Number(final.input_tp) <= -1) break;
  if (tentativa < 2) console.log(`  pico final ${final?.input_tp} dBTP acima de -1: refazendo com mais folga`);
}
console.log(`✓ áudio masterizado: ${saida} (antes ${m.input_i} LUFS → ${final?.input_i ?? "?"} LUFS, pico ${final?.input_tp ?? "?"} dBTP)`);
