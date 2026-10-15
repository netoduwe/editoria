// Testes da biblioteca: node --test scripts/biblioteca.test.mjs (precisa de FFmpeg, como o resto do kit).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm, readdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep, basename } from 'node:path';
import { spawnSync } from 'node:child_process';
import { request } from 'node:http';
import { once } from 'node:events';
import { driveLink, catalog, setLink, createLibraryServer, embedInstagram } from './biblioteca.mjs';
import * as local from './biblioteca-local.mjs';

const drive = 'https://drive.google.com/file/d/ExampleFile_123456/view';
const A = 'a'.repeat(20), B = 'b'.repeat(20), C = 'c'.repeat(20);

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'editoria-biblioteca-'));
  for (const d of ['biblioteca/posters', 'projetos', 'saida', 'entrada']) await mkdir(join(root, d), { recursive: true });
  await writeFile(join(root, 'biblioteca/catalogo.json'), JSON.stringify({ schema_version: 2, itens: [
    { id: A, titulo: '</script><script>x</script>', categoria: 'edicao', estilo: 'editorial-tech', aprender: ['um'], poster: `posters/${A}.jpg` },
    { id: B, titulo: 'Original', categoria: 'edicao', link_original: 'https://www.instagram.com/reel/DeKFBr0vRpv/', autor: '@alguem' },
    { id: C, titulo: 'Link quebrado', categoria: 'motion' }] }));
  await writeFile(join(root, 'biblioteca/videos.json'), JSON.stringify({ [A]: { arquivo: 'a.mp4', url: drive + '?resourcekey=test' }, [C]: { arquivo: 'c.mp4', url: 'https://evil.test/x' } }));
  await writeFile(join(root, 'biblioteca/index.html'), '<script id="boot" type="application/json">/*__BOOT__*/</script>');
  await writeFile(join(root, 'biblioteca/app.js'), '/* app */');
  await writeFile(join(root, 'biblioteca/biblioteca.css'), '/* css */');
  await writeFile(join(root, `biblioteca/posters/${A}.jpg`), 'jpg');
  await mkdir(join(root, 'templates/editorial-tech'), { recursive: true });
  await writeFile(join(root, 'templates/editorial-tech/template.json'), JSON.stringify({ titulo: 'Template de teste', categoria: 'edicao', estilo: 'editorial-tech', aprender: ['um'] }));
  await writeFile(join(root, 'templates/editorial-tech/capa.jpg'), 'capa');
  await mkdir(join(root, 'templates/Invalido'), { recursive: true });
  return root;
}
async function removeFixture(folder) {
  const root = resolve(tmpdir()), target = resolve(folder);
  assert.ok(target.startsWith(root + sep) && /^editoria-(?:biblioteca|export)-/.test(basename(target)));
  await rm(target, { recursive: true, force: true });
}
async function listen(server) { server.listen(0, '127.0.0.1'); await once(server, 'listening'); return `http://127.0.0.1:${server.address().port}`; }
async function close(server) { server.closeAllConnections(); await new Promise(r => server.close(r)); }
function videoDeTeste(arquivo, segundos = 2) {
  const r = spawnSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-f', 'lavfi', '-i', `testsrc=size=1080x1920:rate=30:duration=${segundos}`, '-f', 'lavfi', '-i', `sine=duration=${segundos}`,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', arquivo], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
}

test('aceita links de arquivo do Drive e recusa pastas/URLs inseguras', () => {
  assert.equal(driveLink(null), null);
  assert.equal(driveLink(drive + '?usp=sharing'), drive);
  assert.equal(driveLink('https://drive.google.com/open?id=ExampleFile_123456&resourcekey=test'), drive + '?resourcekey=test');
  for (const value of ['javascript:alert(1)', 'http://drive.google.com/file/d/ExampleFile_123456/view', 'https://drive.google.com.evil.test/file/d/ExampleFile_123456/view', 'https://drive.google.com/drive/folders/ExampleFile_123456', 'https://user:password@drive.google.com/file/d/ExampleFile_123456/view']) {
    assert.throws(() => driveLink(value));
  }
  assert.equal(embedInstagram('https://www.instagram.com/p/DRfEPmiCkUE/'), 'https://www.instagram.com/p/DRfEPmiCkUE/embed/');
  assert.equal(embedInstagram('https://evil.test/reel/x'), null);
});

test('catálogo: link quebrado só desliga o card; terceiro toca pelo player oficial', async () => {
  const root = await fixture();
  try {
    const itens = (await catalog(join(root, 'biblioteca'))).itens;
    assert.equal(itens.find(i => i.id === A).video, `/video/${A}`);
    assert.equal(itens.find(i => i.id === C).video, null);
    assert.equal(itens.find(i => i.id === B).embed, 'https://www.instagram.com/reel/DeKFBr0vRpv/embed/');
    assert.equal(await setLink('a.mp4', drive, join(root, 'biblioteca')), A);
    await assert.rejects(() => setLink('nao-existe', drive, join(root, 'biblioteca')));
    await assert.rejects(() => setLink(A, 'https://evil.test/video', join(root, 'biblioteca')));
  } finally { await removeFixture(root); }
});

test('servidor: só lê a biblioteca e só aceita escrita da própria página', async () => {
  const root = await fixture(), token = 't'.repeat(48);
  const server = createLibraryServer({ root, token });
  try {
    const base = await listen(server);
    const html = await (await fetch(base)).text();
    assert.ok(html.includes(token));
    const dados = await (await fetch(base + '/api/biblioteca')).json();
    assert.equal(dados.turma.length, 3);
    assert.deepEqual(dados.templates.map(t => t.id), ['template:editorial-tech']);
    assert.equal(dados.templates[0].poster, '/templates/editorial-tech/capa.jpg');
    assert.equal(await (await fetch(base + '/templates/editorial-tech/capa.jpg')).text(), 'capa');
    assert.equal((await fetch(base + '/templates/editorial-tech/template.json')).status, 404);
    assert.ok(!JSON.stringify(dados).includes(root));
    assert.equal((await fetch(base + '/marca/design.md')).status, 404);
    assert.equal((await fetch(base + '/%2e%2e/AGENTS.md')).status, 404);
    assert.equal((await fetch(`${base}/posters/${A}.jpg`)).status, 200);
    assert.equal((await fetch(`${base}/meus/..%2F..%2Fentrada/previa.mp4`)).status, 404);
    const badHost = await new Promise((resolve, reject) => {
      const call = request(base, { headers: { Host: 'evil.test' } }, response => { response.resume(); resolve(response.statusCode); });
      call.on('error', reject); call.end();
    });
    assert.equal(badHost, 403);
    const corpo = JSON.stringify({ versao: 0, preferencias: { ocultos: [A], avaliacoes: {}, pastas: [] } });
    const post = headers => fetch(base + '/api/preferencias', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: corpo });
    assert.equal((await post({ Origin: base })).status, 403);
    assert.equal((await post({ Origin: 'https://evil.test', 'X-Biblioteca-Token': token })).status, 403);
    const ok = await post({ Origin: base, 'X-Biblioteca-Token': token });
    assert.equal(ok.status, 200);
    assert.deepEqual((await ok.json()).preferencias.ocultos, [A]);
    assert.equal((await post({ Origin: base, 'X-Biblioteca-Token': token })).status, 409);
  } finally { await close(server); await removeFixture(root); }
});

test('player transmite intervalos do Drive, confirma arquivos grandes e recusa HTML', async () => {
  const root = await fixture(), calls = [];
  let mode = 'video';
  const fetchVideo = async (url, options) => {
    calls.push({ url: url.href, headers: options.headers });
    assert.equal(url.origin, 'https://drive.usercontent.google.com');
    assert.equal(url.searchParams.get('id'), 'ExampleFile_123456');
    assert.deepEqual(Object.keys(options.headers).sort(), ['Accept-Encoding', 'Range']);
    if (mode === 'large' && !url.searchParams.has('confirm')) {
      return new Response('<form id="download-form" action="https://untrusted.test/"><input name="id" value="OtherFile_123456"><input name="confirm" value="t"><input name="uuid" value="public-confirmation"></form>', { headers: { 'Content-Type': 'text/html' } });
    }
    if (mode === 'html') return new Response('<html>Access denied</html>', { headers: { 'Content-Type': 'text/html' } });
    if (options.headers.Range === 'bytes=99-') return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */10' } });
    return new Response(Buffer.from('2345'), { status: 206, headers: { 'Content-Type': 'video/mp4', 'Content-Range': 'bytes 2-5/10', 'Content-Length': '4', 'Content-Disposition': 'attachment' } });
  };
  const server = createLibraryServer({ root, fetchVideo });
  try {
    const base = (await listen(server)) + '/video/';
    const response = await fetch(base + A, { headers: { Range: 'bytes=2-5' } });
    assert.equal(response.status, 206);
    assert.equal(response.headers.get('content-disposition'), null);
    assert.equal(await response.text(), '2345');
    const before = calls.length;
    assert.equal((await fetch(base + B)).status, 404);
    assert.equal((await fetch(base + C)).status, 404);
    assert.equal((await fetch(base + A, { headers: { Range: 'items=0-3' } })).status, 416);
    assert.equal(calls.length, before);
    assert.equal((await fetch(base + A, { headers: { Range: 'bytes=99-' } })).headers.get('content-range'), 'bytes */10');
    mode = 'large';
    assert.equal(await (await fetch(base + A, { headers: { Range: 'bytes=2-5' } })).text(), '2345');
    assert.equal(new URL(calls.at(-1).url).searchParams.get('confirm'), 't');
    mode = 'html';
    const failure = await fetch(base + A, { headers: { Range: 'bytes=2-5' } });
    assert.equal(failure.status, 502); assert.ok(!(await failure.text()).includes('<html>'));
  } finally { await close(server); await removeFixture(root); }
});

test('guardar, organizar, excluir e restaurar sem tocar em entrada/', async () => {
  const root = await fixture(), token = 'k'.repeat(48);
  try {
    await writeFile(join(root, 'entrada/bruto.mp4'), 'BRUTO-INTOCAVEL');
    const projeto = join(root, 'projetos/meu-video');
    await mkdir(join(projeto, 'composicao/assets'), { recursive: true });
    await writeFile(join(projeto, 'edl.json'), '{"fps":30,"segmentos":[]}');
    await writeFile(join(projeto, 'corte.mapa.json'), JSON.stringify({ fonte: 'entrada/bruto.mp4' }));
    await writeFile(join(projeto, 'composicao/index.html'), '<html></html>');
    await writeFile(join(projeto, 'composicao/assets/pessoa.webm'), Buffer.alloc(2048));
    videoDeTeste(join(root, 'saida/meu-video.mp4'));
    await copyFile(join(root, 'saida/meu-video.mp4'), join(projeto, 'corte.mp4'));
    await writeFile(join(root, 'saida/meu-video.srt'), '1');

    const r = await local.guardarProjeto(root, 'projetos/meu-video', { titulo: 'Meu teste', estilo: 'editorial-tech', pasta: 'Anúncios', notas: 'split; legenda curta' });
    assert.equal(r.nome, 'meu-video');
    const info = JSON.parse(await readFile(join(projeto, 'projeto.json'), 'utf8'));
    assert.equal(info.categoria, 'edicao'); assert.equal(info.formato, '9:16'); assert.equal(info.bruto.caminho, 'entrada/bruto.mp4');
    assert.deepEqual(info.aprender, ['split', 'legenda curta']);
    assert.ok((await stat(join(projeto, 'previa.mp4'))).size > 0 && (await stat(join(projeto, 'capa.jpg'))).size > 0);
    const [item] = await local.listarProjetos(root);
    assert.equal(item.id, 'projeto:meu-video'); assert.equal(item.video, '/meus/meu-video/previa.mp4');
    assert.deepEqual((await local.lerPreferencias(root)).pastas[0].itens, ['projeto:meu-video']);

    // Preferências: quem grava com versão velha recebe conflito em vez de apagar a mudança do outro.
    const p = await local.lerPreferencias(root);
    await local.alterarPreferencias(root, pref => { pref.ocultos.push(A); });
    await assert.rejects(() => local.salvarPreferencias(root, p, p.versao), e => e.code === 'CONFLITO');
    assert.throws(() => local.validarPreferencias({ pastas: [{ nome: 'x', itens: ['../../entrada'] }] }));
    assert.deepEqual(local.validarPreferencias({ pastas: [{ nome: 'x', itens: ['template:editorial-tech'] }] }).pastas[0].itens, ['template:editorial-tech']);

    // Compactar remove só o que dá para gerar de novo.
    const c = await local.compactarProjeto(root, 'meu-video');
    assert.deepEqual(c.removidos.sort(), ['composicao/assets/pessoa.webm', 'corte.mp4']);
    for (const f of ['edl.json', 'composicao/index.html', 'previa.mp4', 'capa.jpg', 'projeto.json']) await stat(join(projeto, f));
    assert.ok(JSON.parse(await readFile(join(projeto, 'projeto.json'), 'utf8')).para_reabrir.length >= 2);

    // Servidor: prévia com avançar/voltar e exclusão pela página (vai para a lixeira com o vídeo final).
    const server = createLibraryServer({ root, token });
    try {
      const base = await listen(server);
      const parte = await fetch(base + '/meus/meu-video/previa.mp4', { headers: { Range: 'bytes=0-9' } });
      assert.equal(parte.status, 206); assert.equal((await parte.arrayBuffer()).byteLength, 10);
      const excluir = await fetch(base + '/api/projetos/excluir', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, 'X-Biblioteca-Token': token }, body: JSON.stringify({ nome: 'meu-video', com_video: true }) });
      assert.equal(excluir.status, 200);
      const nada = await fetch(base + '/api/projetos/excluir', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, 'X-Biblioteca-Token': token }, body: JSON.stringify({ nome: '../entrada' }) });
      assert.equal(nada.status, 400);
    } finally { await close(server); }
    assert.deepEqual(await readdir(join(root, 'saida')), []);
    assert.equal((await local.listarProjetos(root)).length, 0);
    const [naLixeira] = await local.listarLixeira(root);
    assert.deepEqual(naLixeira.saida.sort(), ['saida/meu-video.mp4', 'saida/meu-video.srt']);

    const volta = await local.restaurarProjeto(root, 'meu-video');
    assert.equal(volta.nome, 'meu-video');
    assert.deepEqual((await readdir(join(root, 'saida'))).sort(), ['meu-video.mp4', 'meu-video.srt']);
    await local.excluirProjeto(root, 'meu-video');
    assert.equal((await local.esvaziarLixeira(root)).apagados, 1);
    await assert.rejects(() => local.excluirProjeto(root, '../entrada'));
    await assert.rejects(() => local.esvaziarLixeira(root, '../../entrada'));
    assert.equal(await readFile(join(root, 'entrada/bruto.mp4'), 'utf8'), 'BRUTO-INTOCAVEL');
  } finally { await removeFixture(root); }
});

test('exportação mantém o texto curado, copia só capas e limpa caminhos', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'editoria-export-'));
  try {
    for (const d of ['scripts', 'source', 'biblioteca/posters']) await mkdir(join(folder, d), { recursive: true });
    await writeFile(join(folder, 'biblioteca/posters', 'd'.repeat(20) + '.jpg'), 'capa órfã');
    await writeFile(join(folder, 'biblioteca/posters/custom.jpg'), 'arquivo manual');
    await copyFile(new URL('./exportar-biblioteca.mjs', import.meta.url), join(folder, 'scripts/exportar-biblioteca.mjs'));
    await writeFile(join(folder, 'biblioteca/catalogo.json'), JSON.stringify({ schema_version: 2, itens: [{ id: A, titulo: 'Título escrito à mão', categoria: 'motion', estilo: null, aprender: ['traço'], poster: null }] }));
    await writeFile(join(folder, 'biblioteca/videos.json'), JSON.stringify({ [A]: { arquivo: 'x.mp4', url: drive } }));
    await writeFile(join(folder, 'source/poster.jpg'), 'fixture');
    const row = { id: A, tipo: 'video', nome: 'C:/Users/private/clip_1080x1920.mp4', caminho: 'C:/Users/private/clip.mp4', qualidade: 'bom', situacao: 'ativo', poster: 'poster.jpg', metadados: { duracao: 12, largura: 1080, altura: 1920 } };
    await writeFile(join(folder, 'source/feed.json'), JSON.stringify({ itens: [row, { ...row, id: B, nome: 'novo_video.mp4', poster: null }, { ...row, id: C, qualidade: 'ruim' }] }));
    const result = spawnSync(process.execPath, [join(folder, 'scripts/exportar-biblioteca.mjs'), join(folder, 'source/feed.json')], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const text = await readFile(join(folder, 'biblioteca/catalogo.json'), 'utf8'), data = JSON.parse(text);
    assert.ok(!text.includes('C:/Users') && !text.includes('private'));
    assert.deepEqual(data.itens.map(i => i.id), [A, B]);
    assert.equal(data.itens[0].titulo, 'Título escrito à mão'); assert.deepEqual(data.itens[0].aprender, ['traço']);
    assert.equal(data.itens[1].titulo, 'Novo video');
    const links = JSON.parse(await readFile(join(folder, 'biblioteca/videos.json'), 'utf8'));
    assert.equal(links[A].url, drive); assert.equal(links[B].url, null);
    assert.equal(await readFile(join(folder, 'biblioteca/posters', A + '.jpg'), 'utf8'), 'fixture');
    await assert.rejects(() => readFile(join(folder, 'biblioteca/posters', 'd'.repeat(20) + '.jpg')));
    assert.equal(await readFile(join(folder, 'biblioteca/posters/custom.jpg'), 'utf8'), 'arquivo manual');
  } finally { await removeFixture(folder); }
});
