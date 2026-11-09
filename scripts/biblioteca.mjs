#!/usr/bin/env node
// Biblioteca: referências da turma + projetos guardados do aluno, num feed local (127.0.0.1).
// Também tem comandos para o agente guardar, organizar e excluir. Nunca toca entrada/ nem a marca.
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, writeFile, rename, realpath, stat, readdir } from 'node:fs/promises';
import { resolve, dirname, join, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import * as local from './biblioteca-local.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.mp4': 'video/mp4' };

export function driveLink(value) {
  if (!value) return null;
  const url = new URL(value);
  const id = url.pathname.match(/^\/file\/d\/([\w-]+)(?:\/|$)/)?.[1] || (url.pathname === '/open' ? url.searchParams.get('id') : null);
  if (url.protocol !== 'https:' || url.hostname !== 'drive.google.com' || url.port || url.username || url.password || !id || !/^[\w-]{10,200}$/.test(id)) {
    throw new Error('Use o link HTTPS de um arquivo de vídeo do Google Drive (não o link da pasta).');
  }
  const result = new URL(`https://drive.google.com/file/d/${id}/view`);
  const key = url.searchParams.get('resourcekey');
  if (key) result.searchParams.set('resourcekey', key);
  return result.href;
}

const linkOriginal = value => {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : null; } catch { return null; }
};
// Instagram tem player oficial para incorporar; a referência de terceiro toca nele, sem cópia do arquivo.
export function embedInstagram(value) {
  const m = /^https:\/\/(?:www\.)?instagram\.com\/(reel|p)\/([\w-]{5,40})\/?/.exec(value || '');
  return m ? `https://www.instagram.com/${m[1]}/${m[2]}/embed/` : null;
}

// Catálogo da turma (no Git) + links dos vídeos no Drive. Um link com problema só desliga aquele card.
export async function catalog(folder = join(ROOT, 'biblioteca')) {
  const data = JSON.parse(await readFile(resolve(folder, 'catalogo.json'), 'utf8'));
  let links = {};
  try { links = JSON.parse(await readFile(resolve(folder, 'videos.json'), 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  data.itens = (data.itens || []).filter(row => local.ID_TURMA.test(row?.id || '')).map(row => {
    let video_url = null;
    try { video_url = driveLink(links[row.id]?.url); } catch { console.error(`Link inválido em biblioteca/videos.json para ${row.id}; o card fica sem vídeo.`); }
    const original = linkOriginal(row.link_original);
    return { ...row, tipo: 'turma', video_url, link_original: original, embed: video_url ? null : embedInstagram(original),
      video: video_url ? `/video/${row.id}` : null };
  });
  return data;
}

export async function setLink(idOrName, url, folder = join(ROOT, 'biblioteca')) {
  const file = resolve(folder, 'videos.json');
  const links = JSON.parse(await readFile(file, 'utf8'));
  const ids = Object.keys(links).filter(id => id === idOrName || links[id].arquivo === idOrName);
  if (ids.length !== 1) throw new Error('Informe um ID da biblioteca ou um nome de arquivo único em biblioteca/videos.json.');
  links[ids[0]].url = driveLink(url);
  await writeFile(`${file}.tmp`, JSON.stringify(links, null, 2) + '\n');
  await rename(`${file}.tmp`, file);
  return ids[0];
}

// Templates do kit (templates/<nome>/template.json): peças editáveis que o agente monta com a marca do aluno.
export async function listarTemplates(root = ROOT) {
  const base = join(root, 'templates');
  let nomes = [];
  try { nomes = (await readdir(base, { withFileTypes: true })).filter(d => d.isDirectory()).map(d => d.name); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const itens = [];
  for (const nome of nomes.sort()) {
    if (!local.ID_TEMPLATE.test(`template:${nome}`)) continue;
    let info;
    try { info = JSON.parse(await readFile(join(base, nome, 'template.json'), 'utf8')); } catch { continue; }
    const tem = async arq => stat(join(base, nome, arq)).then(() => true, () => false);
    itens.push({ id: `template:${nome}`, tipo: 'template', nome, caminho: `templates/${nome}`,
      titulo: String(info.titulo || nome), categoria: info.categoria === 'motion' ? 'motion' : 'edicao', estilo: info.estilo || null,
      aprender: Array.isArray(info.aprender) ? info.aprender.map(String).slice(0, 4) : [], formato: info.formato || null, duracao: Number(info.duracao) || null,
      poster: (await tem('capa.jpg')) ? `/templates/${nome}/capa.jpg` : null, video: (await tem('previa.mp4')) ? `/templates/${nome}/previa.mp4` : null });
  }
  return itens;
}

// Tudo que o feed mostra: turma, templates, projetos guardados, lixeira e preferências do aluno.
export async function biblioteca(root = ROOT) {
  const [turma, templates, meus, lixeira, preferencias] = await Promise.all([
    catalog(join(root, 'biblioteca')), listarTemplates(root), local.listarProjetos(root), local.listarLixeira(root), local.lerPreferencias(root)]);
  return { turma: turma.itens, templates, meus, lixeira, preferencias, estado: estadoDe(turma.itens, meus, lixeira, preferencias, templates) };
}

function estadoDe(turma, meus, lixeira, preferencias, templates = []) {
  const assinatura = [preferencias.versao, turma.length, templates.length, ...meus.map(m => `${m.nome}:${m.poster}:${m.titulo}`), ...lixeira.map(l => l.item)].join('|');
  return createHash('sha1').update(assinatura).digest('hex').slice(0, 16);
}

async function fetchDriveVideo(link, range, signal, fetchVideo) {
  const source = new URL(driveLink(link));
  const url = new URL('https://drive.usercontent.google.com/download');
  url.searchParams.set('id', source.pathname.split('/')[3]);
  url.searchParams.set('export', 'download');
  if (source.searchParams.has('resourcekey')) url.searchParams.set('resourcekey', source.searchParams.get('resourcekey'));
  const options = { headers: { 'Accept-Encoding': 'identity', ...(range ? { Range: range } : {}) }, signal };
  let upstream = await fetchVideo(url, options);
  if (upstream.status === 200 && upstream.headers.get('content-type')?.includes('text/html')) {
    // Arquivos públicos grandes devolvem um formulário de confirmação em vez dos bytes.
    // Usa só os campos de confirmação; nunca repassa cookies nem credenciais.
    const chunks = []; let size = 0;
    for await (const chunk of upstream.body) {
      size += chunk.length;
      if (size > 65536) throw new Error('Resposta de confirmação inesperada.');
      chunks.push(chunk);
    }
    const html = Buffer.concat(chunks).toString('utf8');
    const form = html.match(/<form\b(?=[^>]*\bid=["']download-form["'])[^>]*>[\s\S]*?<\/form>/i)?.[0];
    if (!form) throw new Error('O Drive não disponibilizou o vídeo público.');
    let confirmed = false;
    for (const input of form.matchAll(/<input\b[^>]*>/gi)) {
      const fields = Object.fromEntries([...input[0].matchAll(/([\w-]+)=["']([^"']*)["']/g)].map(match => [match[1], match[2]]));
      if (['confirm', 'uuid'].includes(fields.name) && /^[\w-]{1,200}$/.test(fields.value || '')) {
        url.searchParams.set(fields.name, fields.value);
        if (fields.name === 'confirm') confirmed = true;
      }
    }
    if (!confirmed) throw new Error('Confirmação de vídeo indisponível.');
    upstream = await fetchVideo(url, options);
  }
  return upstream;
}

const RANGE = /^bytes=(?:\d+-\d*|-\d+)$/;

async function streamVideo(request, response, link, fetchVideo) {
  const range = request.headers.range;
  if (range && (range.length > 80 || !RANGE.test(range))) { response.writeHead(416); response.end(); return; }
  const controller = new AbortController();
  const abort = () => { if (!response.writableEnded) controller.abort(); };
  response.once('close', abort);
  try {
    const upstream = await fetchDriveVideo(link, range, controller.signal, fetchVideo);
    if (upstream.status === 416) {
      const headers = upstream.headers.has('content-range') ? { 'Content-Range': upstream.headers.get('content-range') } : {};
      await upstream.body?.cancel(); response.writeHead(416, headers); response.end(); return;
    }
    const type = upstream.headers.get('content-type')?.split(';')[0];
    if (![200, 206].includes(upstream.status) || !upstream.body || !(type?.startsWith('video/') || type === 'application/octet-stream')) {
      await upstream.body?.cancel(); throw new Error('Vídeo não disponível no Drive.');
    }
    // Cache curto no navegador: rever o mesmo vídeo não baixa tudo de novo do Drive.
    const headers = { 'Content-Type': type === 'application/octet-stream' ? 'video/mp4' : type,
      'Accept-Ranges': 'bytes', 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' };
    for (const name of ['Content-Length', 'Content-Range', 'ETag', 'Last-Modified']) {
      if (upstream.headers.has(name)) headers[name] = upstream.headers.get(name);
    }
    response.writeHead(upstream.status, headers);
    if (request.method === 'HEAD') { await upstream.body.cancel(); response.end(); return; }
    await pipeline(Readable.fromWeb(upstream.body), response);
  } catch (error) {
    if (!controller.signal.aborted) {
      if (response.headersSent) response.destroy();
      else { response.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('Não foi possível carregar este vídeo. Tente novamente.'); }
    }
  } finally { response.off('close', abort); }
}

// Prévia e capa dos projetos do aluno, direto do disco, com avançar/voltar.
async function serveLocalFile(request, response, base, path, type) {
  if (!(await realpath(path).then(p => realpath(base).then(b => p.startsWith(b + sep))).catch(() => false))) { response.writeHead(404); response.end(); return; }
  const { size } = await stat(path);
  const range = request.headers.range;
  let start = 0, end = size - 1, status = 200;
  if (range) {
    if (range.length > 80 || !RANGE.test(range)) { response.writeHead(416); response.end(); return; }
    const [a, b] = range.slice(6).split('-');
    if (a === '') { start = Math.max(0, size - Number(b)); } else { start = Number(a); if (b !== '') end = Math.min(Number(b), size - 1); }
    if (start >= size || start > end) { response.writeHead(416, { 'Content-Range': `bytes */${size}` }); response.end(); return; }
    status = 206;
  }
  response.writeHead(status, { 'Content-Type': type, 'Content-Length': end - start + 1, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache',
    'X-Content-Type-Options': 'nosniff', ...(status === 206 ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}) });
  if (request.method === 'HEAD') { response.end(); return; }
  await pipeline(createReadStream(path, { start, end }), response).catch(() => {});
}

function json(response, status, body) {
  const data = Buffer.from(JSON.stringify(body));
  response.writeHead(status, { 'Content-Type': TYPES['.json'], 'Content-Length': data.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  response.end(data);
}

async function readBody(request, limit = 512 * 1024) {
  const chunks = []; let size = 0;
  for await (const chunk of request) { size += chunk.length; if (size > limit) throw Object.assign(new Error('Pedido grande demais.'), { code: 'INVALIDO' }); chunks.push(chunk); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

// Escrita só a partir da própria página: token da sessão + mesma origem (bloqueia outros sites abertos no navegador).
function canWrite(request, token) {
  const sent = Buffer.from(String(request.headers['x-biblioteca-token'] || '')), expected = Buffer.from(token);
  return sent.length === expected.length && timingSafeEqual(sent, expected)
    && request.headers.origin === `http://${request.headers.host}`
    && String(request.headers['content-type'] || '').startsWith('application/json');
}

const STATIC = { '/app.js': 'app.js', '/biblioteca.css': 'biblioteca.css' };

export function createLibraryServer({ root = ROOT, fetchVideo = fetch, token = randomBytes(24).toString('hex') } = {}) {
  const folder = join(root, 'biblioteca');
  const server = createServer(async (request, response) => {
    try {
      const address = new URL(`http://${request.headers.host}`);
      if (!['127.0.0.1', 'localhost'].includes(address.hostname)) { response.writeHead(403); response.end(); return; }
      const route = decodeURIComponent(new URL(request.url, address).pathname);

      if (request.method === 'POST') {
        if (!canWrite(request, token)) { json(response, 403, { erro: 'Pedido recusado.' }); return; }
        const body = await readBody(request);
        if (route === '/api/preferencias') { json(response, 200, { preferencias: await local.salvarPreferencias(root, body.preferencias, body.versao) }); return; }
        if (route === '/api/projetos/excluir') { json(response, 200, await local.excluirProjeto(root, body.nome, { comVideo: body.com_video === true })); return; }
        if (route === '/api/projetos/restaurar') { json(response, 200, await local.restaurarProjeto(root, body.item)); return; }
        if (route === '/api/lixeira/esvaziar') { json(response, 200, await local.esvaziarLixeira(root, body.item || undefined)); return; }
        json(response, 404, { erro: 'Ação desconhecida.' }); return;
      }
      if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD, POST' }); response.end(); return; }

      const videoId = route.match(/^\/video\/([a-f0-9]{20})$/)?.[1];
      if (videoId) {
        const item = (await catalog(folder)).itens.find(row => row.id === videoId);
        if (!item?.video_url) { response.writeHead(404); response.end(); return; }
        await streamVideo(request, response, item.video_url, fetchVideo); return;
      }
      const media = route.match(/^\/(meus|lixeira|templates)\/([^/]+)\/(capa\.jpg|previa\.mp4)$/);
      if (media) {
        const [, area, nome, arquivo] = media;
        const { projetos, lixeira } = local.caminhos(root);
        const base = area === 'meus' ? projetos : area === 'templates' ? join(root, 'templates') : lixeira;
        if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,140}$/.test(nome)) { response.writeHead(404); response.end(); return; }
        await serveLocalFile(request, response, base, join(base, nome, arquivo), arquivo.endsWith('.mp4') ? TYPES['.mp4'] : TYPES['.jpg']); return;
      }
      if (route === '/api/biblioteca') { json(response, 200, await biblioteca(root)); return; }
      if (route === '/api/estado') { json(response, 200, { estado: (await biblioteca(root)).estado }); return; }

      let body, type;
      if (route === '/' || route === '/index.html') {
        const boot = JSON.stringify({ token }).replace(/</g, '\\u003c');
        body = Buffer.from((await readFile(join(folder, 'index.html'), 'utf8')).replace('/*__BOOT__*/', boot));
        type = TYPES['.html'];
      } else if (route === '/catalogo.json') {
        body = Buffer.from(JSON.stringify(await catalog(folder), null, 2)); type = TYPES['.json'];
      } else {
        const file = STATIC[route] || (/^\/posters\/[a-f0-9]{20}\.jpg$/.test(route) ? route.slice(1) : null);
        if (!file) { response.writeHead(404); response.end(); return; }
        const rootReal = await realpath(folder), path = await realpath(join(folder, file));
        if (!path.startsWith(rootReal + sep) || !(await stat(path)).isFile()) throw Object.assign(new Error('Arquivo fora da biblioteca.'), { code: 'ENOENT' });
        body = await readFile(path);
        type = TYPES[file.slice(file.lastIndexOf('.'))] || 'application/octet-stream';
      }
      response.writeHead(200, { 'Content-Type': type, 'Content-Length': body.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch (error) {
      if (response.headersSent) { response.destroy(); return; }
      const status = error.code === 'CONFLITO' ? 409 : error.code === 'NAO_ENCONTRADO' || error.code === 'ENOENT' ? 404
        : ['INVALIDO', 'EM_USO'].includes(error.code) || error instanceof SyntaxError || error instanceof URIError ? 400 : 500;
      if (request.method === 'POST' || String(request.url).startsWith('/api/')) json(response, status, { erro: status === 500 ? 'Erro inesperado na biblioteca.' : error.message });
      else { response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('Não foi possível abrir a biblioteca. Confira biblioteca/catalogo.json e biblioteca/videos.json.'); }
      if (status === 500) console.error(error);
    }
  });
  return server;
}

// ---------- comandos ----------

const AJUDA = `Biblioteca do Editor IA

  node scripts/biblioteca.mjs [--port 9127]          abre o feed em http://127.0.0.1:9127/
  node scripts/biblioteca.mjs listar [--json]          tudo o que o aluno vê: turma, projetos, pastas
  node scripts/biblioteca.mjs guardar <projeto> [--titulo "…"] [--estilo nome] [--referencia ID]
        [--pasta "…"] [--notas "traço 1; traço 2"] [--video saida/x.mp4] [--capa 1.5] [--categoria edicao|motion] [--compactar]
  node scripts/biblioteca.mjs compactar <projeto>      apaga só o que dá para gerar de novo (a prévia fica)
  node scripts/biblioteca.mjs excluir <projeto> [--com-video]   manda para a lixeira (projetos/.lixeira)
  node scripts/biblioteca.mjs restaurar <projeto>
  node scripts/biblioteca.mjs esvaziar-lixeira
  node scripts/biblioteca.mjs ocultar <ID> | mostrar <ID>
  node scripts/biblioteca.mjs pasta "<nome>" <ID ou projeto:nome>... [--remover]
  node scripts/biblioteca.mjs vincular <ID-ou-arquivo.mp4> <link-do-Drive>   (professor)`;

function parseArgs(args) {
  const posicionais = [], opcoes = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const chave = a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      if (['compactar', 'comVideo', 'json', 'remover'].includes(chave)) opcoes[chave] = true;
      else { if (args[i + 1] === undefined) throw new Error(`Falta o valor de ${a}.`); opcoes[chave] = args[++i]; }
    } else posicionais.push(a);
  }
  return { posicionais, opcoes };
}

async function main() {
  const [comando, ...resto] = process.argv.slice(2);
  const { posicionais: p, opcoes: o } = parseArgs(resto);
  const caminho = v => (v ? resolve(process.cwd(), v) : v);
  const id = v => (local.ID_TURMA.test(v) || local.ID_PROJETO.test(v) || local.ID_TEMPLATE.test(v) ? v : local.NOME.test(v) ? `projeto:${v}` : v);
  switch (comando) {
    case 'ajuda': case '--help': case '-h': console.log(AJUDA); return;
    case 'vincular':
      if (!p[0] || !p[1]) throw new Error('Uso: node scripts/biblioteca.mjs vincular <ID-ou-arquivo.mp4> <link-do-Drive>');
      console.log(`Link atualizado: ${await setLink(p[0], p[1])}. Recarregue a biblioteca.`); return;
    case 'listar': {
      const b = await biblioteca(ROOT);
      if (o.json) { console.log(JSON.stringify(b, null, 2)); return; }
      const ocultos = new Set(b.preferencias.ocultos);
      console.log('MEUS PROJETOS'); for (const m of b.meus) console.log(`  projeto:${m.nome}  ${m.titulo}${m.estilo ? ` · estilo ${m.estilo}` : ''}`);
      if (!b.meus.length) console.log('  (nenhum ainda)');
      console.log('TEMPLATES'); for (const t of b.templates) console.log(`  ${t.id}  ${t.titulo} · ${t.caminho}`);
      console.log('DA TURMA'); for (const t of b.turma) console.log(`  ${t.id}  ${t.titulo}${t.estilo ? ` · estilo ${t.estilo}` : ''}${t.autor ? ` · ${t.autor}` : ''}${ocultos.has(t.id) ? ' (oculto)' : ''}`);
      console.log('PASTAS'); for (const f of b.preferencias.pastas) console.log(`  ${f.nome}: ${f.itens.length} item(ns)`);
      if (b.lixeira.length) { console.log('LIXEIRA'); for (const l of b.lixeira) console.log(`  ${l.nome}  ${l.titulo}`); }
      return;
    }
    case 'guardar': {
      if (!p[0]) throw new Error('Uso: node scripts/biblioteca.mjs guardar projetos/<nome> [opções]');
      const r = await local.guardarProjeto(ROOT, caminho(p[0]), { ...o, video: caminho(o.video), bruto: o.bruto && caminho(o.bruto) });
      console.log(`✓ Guardado na biblioteca: ${r.titulo} (prévia ${r.previa_mb} MB).`);
      if (r.compactacao) console.log(`  Compactado: ${r.compactacao.liberado_mb} MB liberados.${r.compactacao.ainda_grandes.length ? ' Ainda grandes: ' + r.compactacao.ainda_grandes.join(', ') : ''}`);
      return;
    }
    case 'compactar': {
      const r = await local.compactarProjeto(ROOT, caminho(p[0]));
      console.log(`✓ ${r.liberado_mb} MB liberados (${r.removidos.join(', ') || 'nada para remover'}).${r.ainda_grandes.length ? ' Ainda grandes: ' + r.ainda_grandes.join(', ') : ''}`);
      return;
    }
    case 'excluir': {
      const r = await local.excluirProjeto(ROOT, caminho(p[0]), { comVideo: o.comVideo === true });
      console.log(`✓ ${r.nome} foi para a lixeira (projetos/.lixeira).${r.saida.length ? ' Junto: ' + r.saida.join(', ') : ''} Para desfazer: node scripts/biblioteca.mjs restaurar ${r.nome}`);
      return;
    }
    case 'restaurar': { const r = await local.restaurarProjeto(ROOT, p[0]); console.log(`✓ Restaurado em projetos/${r.nome}.`); return; }
    case 'esvaziar-lixeira': { const r = await local.esvaziarLixeira(ROOT, p[0]); console.log(`✓ ${r.apagados} item(ns) apagado(s) de vez.`); return; }
    case 'ocultar': case 'mostrar': {
      if (!p.length) throw new Error(`Uso: node scripts/biblioteca.mjs ${comando} <ID>`);
      await local.alterarPreferencias(ROOT, pref => {
        const ids = p.map(id);
        pref.ocultos = comando === 'ocultar' ? [...new Set([...pref.ocultos, ...ids])] : pref.ocultos.filter(x => !ids.includes(x));
      });
      console.log(`✓ ${comando === 'ocultar' ? 'Oculto' : 'Visível de novo'} na biblioteca do aluno.`); return;
    }
    case 'pasta': {
      if (!p[0] || p.length < 2) throw new Error('Uso: node scripts/biblioteca.mjs pasta "<nome>" <ID ou projeto:nome>... [--remover]');
      let pasta;
      await local.alterarPreferencias(ROOT, pref => { pasta = local.adicionarNaPasta(pref, p[0], p.slice(1).map(id), o.remover === true); });
      console.log(`✓ Pasta "${pasta.nome}": ${pasta.itens.length} item(ns).`); return;
    }
    case undefined: case '--port': {
      const args = process.argv.slice(2), index = args.indexOf('--port');
      const port = index >= 0 ? Number(args[index + 1]) : 9127;
      if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Porta inválida.');
      const server = createLibraryServer();
      server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `A porta ${port} está ocupada (talvez a biblioteca já esteja aberta). Use --port 9128.` : error.message); process.exitCode = 1; });
      server.listen(port, '127.0.0.1', () => console.log(`Biblioteca: http://127.0.0.1:${port}/ — Ctrl+C para encerrar.`));
      return;
    }
    default: throw new Error(`Comando desconhecido: ${comando}\n\n${AJUDA}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
