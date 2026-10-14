#!/usr/bin/env node
// Confere se o Editor IA está pronto: Node, FFmpeg, Chrome, transcrição local e render do HyperFrames.
// Uso: node scripts/teste-setup.mjs
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const shell = process.platform === "win32";
const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: "utf8", shell, maxBuffer: 64 * 1024 * 1024, ...opts });
const ok = [], falhas = [], avisos = [];
const marca = (cond, nome, dica) => { (cond ? ok : falhas).push(cond ? nome : `${nome} — ${dica}`); console.log(`${cond ? "✓" : "✗"} ${nome}`); };
// itens opcionais: não impedem editar vídeos, só a cópia de estilo a partir de links
const aviso = (cond, nome, dica) => { if (!cond) avisos.push(`${nome} — ${dica}`); console.log(`${cond ? "✓" : "⚠"} ${nome}`); };

const node = Number(process.versions.node.split(".")[0]);
marca(node >= 20, `Node.js ${process.versions.node}`, "instale o Node 20 ou mais novo");
marca(run("ffmpeg", ["-version"]).status === 0, "FFmpeg", "instale o FFmpeg e reabra o terminal");
marca(run("ffprobe", ["-version"]).status === 0, "FFprobe", "vem junto com o FFmpeg");

const doctor = run("npx", ["--yes", "hyperframes", "doctor", "--json"]);
let checks = [];
try { checks = JSON.parse(doctor.stdout).checks ?? []; } catch { /* formato antigo */ }
const chrome = checks.find((c) => /chrome/i.test(c.name ?? c.id ?? ""));
marca(doctor.status === 0 && (!chrome || chrome.ok !== false), "HyperFrames + Chrome", "rode `npx hyperframes doctor` e siga as dicas");

const modelos = run("npx", ["--yes", "hyperframes", "models", "list", "--json"]).stdout ?? "";
marca(/parakeet[^\n]*("installed"\s*:\s*true|installed)/i.test(modelos) && !/not installed/i.test(modelos),
  "Transcrição local (Parakeet)", "rode `npx hyperframes models install parakeet`");

// yt-dlp: baixar referências de estilo (YouTube/Instagram/TikTok)
const yt = spawnSync("yt-dlp", ["--version"], { encoding: "utf8" });
aviso(yt.status === 0, `yt-dlp ${yt.status === 0 ? yt.stdout.trim() : ""}`.trim(), "para copiar estilos de links: winget install yt-dlp.yt-dlp · brew install yt-dlp");
if (yt.status === 0) {
  const sim = spawnSync("yt-dlp", ["--js-runtimes", "node", "--remote-components", "ejs:github", "--no-warnings", "--simulate", "--print", "%(id)s",
    "https://www.youtube.com/watch?v=jNQXAC9IVRw"], { encoding: "utf8", timeout: 90000 });
  aviso(sim.status === 0 && /jNQXAC9IVRw/.test(sim.stdout), "yt-dlp acessa o YouTube", "atualize o yt-dlp (winget upgrade yt-dlp.yt-dlp · brew upgrade yt-dlp) e confira a internet");
}

// Render de verdade: 2 s de título animado
const dir = join("projetos", "_teste-setup");
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
const init = run("npx", ["--yes", "hyperframes", "init", dir, "--non-interactive", "--example=blank"]);
if (init.status === 0) {
  writeFileSync(join(dir, "index.html"), `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=1080, height=1920">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>html,body{margin:0;width:1080px;height:1920px;background:#0B1426}#root{width:100%;height:100%;display:flex;align-items:center;justify-content:center}
h1{font:800 120px sans-serif;color:#fff}</style></head><body>
<div id="root" data-composition-id="teste" data-start="0" data-duration="2" data-width="1080" data-height="1920"><h1 id="t" class="clip" data-start="0" data-duration="2" data-track-index="0">Editor IA ✓</h1></div>
<script>const tl=gsap.timeline({paused:true});tl.fromTo("#t",{opacity:0,y:30},{opacity:1,y:0,duration:0.5},0);window.__timelines["teste"]=tl;</script></body></html>`);
}
const saida = join(dir, "teste.mp4");
const render = init.status === 0 ? run("npx", ["--yes", "hyperframes", "render", "--quality", "draft", "-o", "teste.mp4"], { cwd: dir }) : { status: 1 };
marca(render.status === 0 && existsSync(saida), "Render de vídeo (HyperFrames)", "rode `npx hyperframes doctor`; confira Chrome e espaço em disco");

if (avisos.length) console.log(`\n⚠ Opcional (só para copiar estilo a partir de links):\n  - ${avisos.join("\n  - ")}`);
console.log(falhas.length ? `\n✗ Faltam ${falhas.length} item(ns):\n  - ${falhas.join("\n  - ")}` : "\n✓ Tudo pronto. Coloque um vídeo em entrada/ e peça: edita entrada/<arquivo>");
if (!falhas.length) rmSync(dir, { recursive: true, force: true });
process.exit(falhas.length ? 1 : 0);
