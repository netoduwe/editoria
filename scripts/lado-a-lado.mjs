#!/usr/bin/env node
// Folha de comparação visual: cada linha = [quadro da REFERÊNCIA | quadro do TESTE] em momentos equivalentes.
// Uso: node scripts/lado-a-lado.mjs <video-ref> <video-teste> "<tRef>:<tTeste>,<tRef>:<tTeste>,…" [saida.jpg]
// Ex.: node scripts/lado-a-lado.mjs referencias/estilos/x/video.mp4 projetos/x-teste/render.mp4 "0.5:0.5,2.8:3.1,12:9.4"
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const [ref, teste, paresArg, saidaArg] = process.argv.slice(2);
if (!ref || !teste || !paresArg) {
  console.error('Uso: node scripts/lado-a-lado.mjs <video-ref> <video-teste> "tRef:tTeste,tRef:tTeste" [saida.jpg]');
  process.exit(1);
}
const pares = paresArg.split(",").map((p) => p.split(":").map(Number)).filter((p) => p.length === 2 && p.every(Number.isFinite));
const saida = saidaArg ?? "lado-a-lado.jpg";
const tmp = mkdtempSync(join(tmpdir(), "lado-"));
// cada lado cabe numa caixa 360×640 sem distorcer (vídeos horizontais ganham faixas)
const caixa = "scale=360:640:force_original_aspect_ratio=decrease,pad=360:640:(ow-iw)/2:(oh-ih)/2:color=0x222222";
pares.forEach(([tr, tt], i) => {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-v", "error", "-y", "-ss", String(tr), "-i", ref, "-ss", String(tt), "-i", teste,
    "-filter_complex", `[0:v]${caixa}[a];[1:v]${caixa}[b];[a][b]hstack=inputs=2,pad=iw+0:ih+8:0:0:color=0xFFFFFF`,
    "-frames:v", "1", join(tmp, `p_${String(i).padStart(2, "0")}.png`)]);
  if (r.status !== 0) { console.error(`✗ par ${tr}:${tt}: ${r.stderr}`); process.exit(1); }
});
const r = spawnSync("ffmpeg", ["-hide_banner", "-v", "error", "-y", "-i", join(tmp, "p_%02d.png"), "-vf", `tile=1x${pares.length}`, "-frames:v", "1", saida]);
rmSync(tmp, { recursive: true, force: true });
if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
console.log(`✓ ${saida} — ${pares.length} linha(s): esquerda = referência, direita = teste`);
