#!/usr/bin/env node
// Biblioteca local de referências. Não instala ferramentas nem altera a marca.
import { createServer } from 'node:http';
import { readFile, writeFile, realpath, stat } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = resolve(ROOT, 'biblioteca');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg' };

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

export async function catalog(folder = DATA) {
  const data = JSON.parse(await readFile(resolve(folder, 'catalogo.json'), 'utf8'));
  const links = JSON.parse(await readFile(resolve(folder, 'videos.json'), 'utf8'));
  for (const row of data.itens) {
    if (row.tipo !== 'video') continue;
    row.video_url = driveLink(links[row.id]?.url);
    row.video_player_url = row.video_url ? `/video/${row.id}` : null;
    row.disponivel = Boolean(row.video_url);
    if (row.video_url) row.caminho = row.video_url;
  }
  return data;
}

export async function setLink(idOrName, url, folder = DATA) {
  const file = resolve(folder, 'videos.json');
  const links = JSON.parse(await readFile(file, 'utf8'));
  const ids = Object.keys(links).filter(id => id === idOrName || links[id].arquivo === idOrName);
  if (ids.length !== 1) throw new Error('Informe um ID da biblioteca ou um nome de arquivo único em biblioteca/videos.json.');
  links[ids[0]].url = driveLink(url);
  await writeFile(`${file}.tmp`, JSON.stringify(links, null, 2) + '\n');
  const { rename } = await import('node:fs/promises');
  await rename(`${file}.tmp`, file);
  return ids[0];
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
    // Large public files return a download confirmation form instead of bytes.
    // Use only its confirmation fields; never forward cookies or login credentials.
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

async function streamVideo(request, response, link, fetchVideo) {
  const range = request.headers.range;
  if (range && (range.length > 80 || !/^bytes=(?:\d+-\d*|-\d+)$/.test(range))) {
    response.writeHead(416); response.end(); return;
  }
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
    const headers = { 'Content-Type': type === 'application/octet-stream' ? 'video/mp4' : type,
      'Accept-Ranges': 'bytes', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
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

export function createLibraryServer({ folder = DATA, fetchVideo = fetch } = {}) {
  return createServer(async (request, response) => {
    try {
      // Read-only server: assessments and hidden cards belong to this browser.
      if (!['GET', 'HEAD'].includes(request.method)) {
        response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return;
      }
      const address = new URL(`http://${request.headers.host}`);
      if (!['127.0.0.1', 'localhost'].includes(address.hostname)) {
        response.writeHead(403); response.end(); return;
      }
      const route = new URL(request.url, address).pathname;
      const videoId = route.match(/^\/video\/([a-f0-9]{20})$/)?.[1];
      if (videoId) {
        const item = (await catalog(folder)).itens.find(row => row.id === videoId && row.tipo === 'video');
        if (!item?.video_url) { response.writeHead(404); response.end(); return; }
        await streamVideo(request, response, item.video_url, fetchVideo); return;
      }
      let body, type;
      if (route === '/' || route === '/index.html') {
        const data = JSON.stringify(await catalog(folder)).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
        body = Buffer.from((await readFile(resolve(folder, 'index.html'), 'utf8')).replace('/*__CATALOG__*/', data));
        type = TYPES['.html'];
      } else if (route === '/catalogo.json') {
        body = Buffer.from(JSON.stringify(await catalog(folder), null, 2)); type = TYPES['.json'];
      } else {
        const allowed = ['/alunos.js', '/biblioteca.css', '/README.md', '/videos.json'].includes(route) || /^\/posters\/[a-f0-9-]+\.jpg$/.test(route);
        if (!allowed) { response.writeHead(404); response.end(); return; }
        const root = await realpath(folder), path = await realpath(resolve(folder, route.slice(1)));
        if (!path.startsWith(root + sep) || !(await stat(path)).isFile()) throw new Error('Arquivo fora da biblioteca.');
        body = await readFile(path);
        type = route.endsWith('.jpg') ? TYPES['.jpg'] : route.endsWith('.js') ? TYPES['.js'] : route.endsWith('.css') ? TYPES['.css'] : route.endsWith('.json') ? TYPES['.json'] : 'text/plain; charset=utf-8';
      }
      response.writeHead(200, { 'Content-Type': type, 'Content-Length': body.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Não foi possível abrir a biblioteca. Confira biblioteca/catalogo.json e biblioteca/videos.json.');
    }
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === 'vincular') {
    if (!args[1] || !args[2]) throw new Error('Uso: node scripts/biblioteca.mjs vincular <ID-ou-arquivo.mp4> <link-do-Drive>');
    console.log(`Link atualizado: ${await setLink(args[1], args[2])}. Recarregue a biblioteca.`); return;
  }
  const index = args.indexOf('--port');
  const port = index >= 0 ? Number(args[index + 1]) : 9127;
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Porta inválida.');
  const server = createLibraryServer();
  server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `A porta ${port} está ocupada. Use --port 9128.` : error.message); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`Biblioteca: http://127.0.0.1:${port}/ — Ctrl+C para encerrar.`));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
