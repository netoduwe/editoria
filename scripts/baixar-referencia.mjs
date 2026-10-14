#!/usr/bin/env node
// Baixa um vídeo de referência (YouTube, Shorts, Instagram, TikTok…) para estudar o estilo de edição.
// Uso: node scripts/baixar-referencia.mjs <link-ou-arquivo> [nome] [--cookies-de firefox|chrome|edge|safari] [--cookies arquivo.txt]
// Saída: referencias/estilos/<nome>/video.mp4 + fonte.json (link, autor, título, data, duração).
// O vídeo baixado é só para estudo: não publique trechos dele.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, readdirSync, renameSync } from "node:fs";
import { join, basename, extname } from "node:path";

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const cookiesDe = opt("--cookies-de");
const cookiesArq = opt("--cookies");
const [fonte, nomeArg] = args;
if (!fonte) {
  console.error("Uso: node scripts/baixar-referencia.mjs <link-ou-arquivo> [nome] [--cookies-de firefox] [--cookies cookies.txt]");
  process.exit(1);
}
const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
const shell = false; // yt-dlp é executável: sem shell, links com & e ? passam intactos

// Arquivo local (plano B: o aluno baixou/gravou a tela e arrastou o arquivo)
if (existsSync(fonte)) {
  const nome = slug(nomeArg ?? basename(fonte, extname(fonte)));
  const dir = join("referencias", "estilos", nome);
  mkdirSync(dir, { recursive: true });
  const destino = join(dir, "video" + extname(fonte).toLowerCase());
  copyFileSync(fonte, destino);
  writeFileSync(join(dir, "fonte.json"), JSON.stringify({ origem: "arquivo local", arquivo_original: fonte, copiado_em: new Date().toISOString() }, null, 2));
  console.log(`✓ referência copiada: ${destino}`);
  process.exit(0);
}

if (spawnSync("yt-dlp", ["--version"], { shell }).status !== 0) {
  console.error("✗ yt-dlp não está instalado. Windows: winget install yt-dlp.yt-dlp · macOS: brew install yt-dlp · depois reabra o terminal.");
  process.exit(1);
}

// 1) Metadados primeiro (rápido) para nomear a pasta
const base = ["--no-playlist", "--no-progress", "--js-runtimes", "node", "--remote-components", "ejs:github", "--no-warnings"];
if (cookiesDe) base.push("--cookies-from-browser", cookiesDe);
if (cookiesArq) base.push("--cookies", cookiesArq);
const meta = spawnSync("yt-dlp", [...base, "--dump-single-json", "--skip-download", fonte], { encoding: "utf8", shell, maxBuffer: 64 * 1024 * 1024 });

const explicar = (err) => {
  const e = err.toLowerCase();
  if (/login|log in|cookies|private|not available|rate.?limit|429|empty media response/.test(e) && /instagram|tiktok|facebook/.test(fonte))
    return "A plataforma pediu login ou limitou o acesso. Opções: (1) rode de novo com --cookies-de firefox (você precisa estar logado nesse navegador; no Windows o Chrome costuma não funcionar); (2) baixe/grave a tela do vídeo no celular, arraste o arquivo para referencias/ e rode este script com o caminho do arquivo.";
  if (/sign in to confirm|not a bot/.test(e))
    return "O YouTube pediu verificação anti-robô. Espere alguns minutos e tente de novo, ou use --cookies-de firefox com uma conta logada.";
  if (/unsupported url/.test(e)) return "Site não suportado. Baixe o arquivo manualmente e passe o caminho dele.";
  if (/js runtime|challenge|signature/.test(e)) return "Problema na verificação do YouTube. Atualize: winget upgrade yt-dlp.yt-dlp · brew upgrade yt-dlp · pip install -U \"yt-dlp[default]\".";
  return "Atualize o yt-dlp (os sites mudam com frequência) e tente de novo; se persistir, use o arquivo local.";
};
if (meta.status !== 0) {
  const err = (meta.stderr || "").trim().split("\n").filter((l) => /error/i.test(l)).slice(-2).join("\n") || meta.stderr;
  console.error(`✗ não consegui acessar o vídeo:\n${err}\n\n→ ${explicar(meta.stderr || "")}`);
  process.exit(1);
}
const info = JSON.parse(meta.stdout);
const nome = slug(nomeArg ?? `${info.channel || info.uploader || info.extractor_key}-${info.id}`);
const dir = join("referencias", "estilos", nome);
mkdirSync(dir, { recursive: true });

// 2) Download: prefere H.264 (abre em qualquer lugar), até 1080p de largura útil, áudio AAC; junta em MP4
const dl = spawnSync("yt-dlp", [...base, "-f", "bv*+ba/b", "-S", "res:1080,vcodec:h264,fps,acodec:m4a",
  "--merge-output-format", "mp4", "-o", join(dir, "video.%(ext)s"), "--no-part", fonte], { stdio: ["ignore", "inherit", "pipe"], encoding: "utf8", shell });
if (dl.status !== 0) {
  console.error(`✗ falhou o download:\n${(dl.stderr || "").trim().split("\n").slice(-3).join("\n")}\n\n→ ${explicar(dl.stderr || "")}`);
  process.exit(1);
}
const baixado = readdirSync(dir).find((f) => f.startsWith("video."));
if (baixado && baixado !== "video.mp4" && extname(baixado) !== ".mp4") renameSync(join(dir, baixado), join(dir, "video" + extname(baixado)));

const fonteInfo = {
  link: info.webpage_url ?? fonte, plataforma: info.extractor_key, autor: info.uploader ?? info.channel ?? null,
  perfil: info.uploader_id ?? null, titulo: info.title ?? null, publicado: info.upload_date ?? null,
  duracao_s: info.duration ?? null, resolucao: info.width && info.height ? `${info.width}x${info.height}` : null,
  fps: info.fps ?? null, licenca: info.license ?? null, baixado_em: new Date().toISOString(),
  uso: "referência de estudo de estilo — não publicar trechos deste vídeo",
};
writeFileSync(join(dir, "fonte.json"), JSON.stringify(fonteInfo, null, 2));
console.log(`✓ referência baixada: ${join(dir, readdirSync(dir).find((f) => f.startsWith("video.")))}`);
console.log(`  ${fonteInfo.plataforma} · ${fonteInfo.autor ?? "?"} · ${fonteInfo.duracao_s ?? "?"} s · ${fonteInfo.resolucao ?? "?"}`);
console.log(`  próximo passo: node scripts/analisar-referencia.mjs ${join(dir, "video.mp4")}`);
