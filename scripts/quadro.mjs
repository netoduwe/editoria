#!/usr/bin/env node
// Olhar de perto um instante do vídeo: quadro em resolução cheia, grade de medição, cor exata, recorte ampliado
// e sequência quadro a quadro (para cronometrar animações).
// Uso: node scripts/quadro.mjs <video> <tempo_s> [--grade] [--cor x,y[;x,y…]] [--recorte x,y,l,a] [--seq 0.5] [--saida pasta]
//   --grade        linhas a cada 10% (finas) e 50% (grossas): leia posição/tamanho em % e converta para px
//   --cor          média de 5×5 px em cada ponto (coordenadas do quadro inteiro) → #HEX
//   --recorte      recorta x,y,largura,altura (px) e amplia 2× — para identificar a fonte e ver contorno/sombra
//   --seq d        d segundos (máx 1) de quadros consecutivos na taxa nativa → cronometrar entradas/saídas
import { spawnSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { join, dirname, relative, isAbsolute } from "node:path";

const args = process.argv.slice(2);
const flag = (k) => { const i = args.indexOf(k); return i >= 0 ? (args.splice(i, 1), true) : false; };
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const grade = flag("--grade");
const cores = opt("--cor");
const recorte = opt("--recorte");
const seq = opt("--seq");
const saidaArg = opt("--saida");
const [video, tArg] = args;
if (!video || tArg === undefined || !existsSync(video)) {
  console.error("Uso: node scripts/quadro.mjs <video> <tempo_s> [--grade] [--cor x,y;x,y] [--recorte x,y,l,a] [--seq 0.5] [--saida pasta]");
  process.exit(1);
}
const t = Number(tArg);
const rel = relative(process.cwd(), video);
const protegido = rel.startsWith("..") || isAbsolute(rel) || /^entrada[\\/]/.test(rel); // nunca escrever na entrada
const saida = saidaArg ?? (protegido ? join("projetos", "_quadros") : join(dirname(video), "analise", "quadros"));
mkdirSync(saida, { recursive: true });
const ff = (a, o = {}) => spawnSync("ffmpeg", ["-hide_banner", "-v", "error", "-y", "-ss", t.toFixed(3), "-i", video, ...a], { maxBuffer: 256 * 1024 * 1024, ...o });
const tag = t.toFixed(2).replace(".", "s");
const res = { tempo_s: t };

const png = join(saida, `quadro_${tag}.png`);
ff(["-frames:v", "1", png]);
res.quadro = png;

if (grade) {
  const g = join(saida, `quadro_${tag}_grade.png`);
  ff(["-frames:v", "1", "-vf", "drawgrid=w=iw/10:h=ih/10:t=1:c=0xFF00FF@0.55,drawgrid=w=iw/2:h=ih/2:t=3:c=0xFF00FF@0.8", g]);
  res.grade = g;
  res.grade_explicacao = "linhas finas a cada 10% da largura/altura, grossas no meio; em 1080×1920: 108 px na horizontal, 192 px na vertical";
}
if (cores) {
  res.cores = cores.split(";").map((p) => {
    const [x, y] = p.split(",").map(Number);
    const raw = ff(["-frames:v", "1", "-vf", `crop=5:5:${Math.max(0, x - 2)}:${Math.max(0, y - 2)},scale=1:1:flags=area,format=rgb24`, "-f", "rawvideo", "-"]).stdout;
    const hex = raw?.length >= 3 ? "#" + [...raw.subarray(0, 3)].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase() : null;
    return { x, y, hex };
  });
}
if (recorte) {
  const [x, y, l, a] = recorte.split(",").map(Number);
  const r = join(saida, `recorte_${tag}_${x}-${y}-${l}x${a}.png`);
  ff(["-frames:v", "1", "-vf", `crop=${l}:${a}:${x}:${y},scale=iw*2:ih*2:flags=lanczos`, r]);
  res.recorte = r;
}
if (seq) {
  const d = Math.min(1, Number(seq));
  const probe = JSON.parse(spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=avg_frame_rate", "-of", "json", video], { encoding: "utf8" }).stdout);
  const [n, den] = probe.streams[0].avg_frame_rate.split("/").map(Number);
  const fps = n / den;
  const qtd = Math.max(2, Math.round(d * fps));
  const s = join(saida, `seq_${tag}_${qtd}q.jpg`);
  ff(["-t", d.toFixed(3), "-vf", `scale=216:-2,tile=10x${Math.ceil(qtd / 10)}`, "-frames:v", "1", s]);
  res.sequencia = s;
  res.sequencia_explicacao = `${qtd} quadros seguidos (10 por linha) a ${fps.toFixed(2)} qps: cada quadro = ${(1000 / fps).toFixed(1)} ms; conte quadros para cronometrar entradas/saídas`;
}
console.log(JSON.stringify(res, null, 2));
