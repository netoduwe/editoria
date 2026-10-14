#!/usr/bin/env node
// Corta o vídeo bruto pelas falas escolhidas (EDL) e gera um corte limpo a 30 fps.
// Uso: node scripts/cortar.mjs <video-bruto> <edl.json> <saida.mp4>
//
// edl.json:
// { "fps": 30, "segmentos": [ { "id": "hook", "inicio": 4.85, "fim": 7.85, "texto": "..." }, ... ] }
// inicio/fim em segundos do BRUTO. O bruto nunca é alterado.
// Também grava <saida>.mapa.json com onde cada segmento cai na timeline nova.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const [video, edlPath, saida] = process.argv.slice(2);
if (!video || !edlPath || !saida) {
  console.error("Uso: node scripts/cortar.mjs <video-bruto> <edl.json> <saida.mp4>");
  process.exit(1);
}
const edl = JSON.parse(readFileSync(edlPath, "utf8"));
const fps = edl.fps ?? 30;
const segs = edl.segmentos ?? edl.segments;
if (!Array.isArray(segs) || segs.length === 0) throw new Error("edl.json sem 'segmentos'");

const fade = 0.012; // 12 ms nas emendas: evita estalo sem engolir fonema
const filtros = [];
const mapa = [];
let pos = 0;
segs.forEach((s, i) => {
  const ini = Math.floor(s.inicio * fps);
  const fim = Math.ceil(s.fim * fps);
  if (fim <= ini) throw new Error(`segmento ${s.id ?? i}: fim <= inicio`);
  const dur = fim - ini;
  const a = (ini / fps).toFixed(6), b = (fim / fps).toFixed(6), d = dur / fps;
  filtros.push(
    `[0:v]trim=start=${a}:end=${b},setpts=PTS-STARTPTS,fps=${fps},trim=end_frame=${dur},setpts=PTS-STARTPTS,` +
      `scale='if(gt(ih,iw),1080,-2)':'if(gt(ih,iw),-2,1080)',setsar=1[v${i}]`,
    `[0:a]atrim=start=${a}:end=${b},asetpts=PTS-STARTPTS,afade=t=in:d=${fade},` +
      `afade=t=out:st=${(d - fade).toFixed(6)}:d=${fade},apad=whole_dur=${d.toFixed(6)}[a${i}]`,
  );
  mapa.push({ id: s.id ?? `s${i + 1}`, texto: s.texto ?? "", bruto_inicio: ini / fps, bruto_fim: fim / fps,
    timeline_inicio: pos / fps, timeline_fim: (pos + dur) / fps });
  pos += dur;
});
filtros.push(segs.map((_, i) => `[v${i}][a${i}]`).join("") + `concat=n=${segs.length}:v=1:a=1[v][a]`);

mkdirSync(dirname(saida), { recursive: true });
const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", video, "-filter_complex", filtros.join(";"),
  "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-crf", "16", "-preset", "medium", "-g", String(fps),
  "-pix_fmt", "yuv420p", "-r", String(fps), "-c:a", "aac", "-b:a", "256k", "-ar", "48000",
  "-movflags", "+faststart", saida], { stdio: "inherit" });
if (r.status !== 0) process.exit(r.status ?? 1);

writeFileSync(saida.replace(/\.[^.]+$/, "") + ".mapa.json", JSON.stringify({ fonte: video, fps, frames: pos, segmentos: mapa }, null, 2));
console.log(`✓ corte: ${saida} — ${(pos / fps).toFixed(2)} s, ${segs.length} trechos`);
for (const m of mapa) console.log(`  ${m.id.padEnd(14)} bruto ${m.bruto_inicio.toFixed(2)}–${m.bruto_fim.toFixed(2)} → timeline ${m.timeline_inicio.toFixed(2)}–${m.timeline_fim.toFixed(2)}`);
