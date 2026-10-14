import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep, basename } from 'node:path';
import { spawnSync } from 'node:child_process';
import { request } from 'node:http';
import { once } from 'node:events';
import { driveLink, catalog, setLink, createLibraryServer } from './biblioteca.mjs';

const drive = 'https://drive.google.com/file/d/ExampleFile_123456/view';
async function removeFixture(folder) {
  const root = resolve(tmpdir()), target = resolve(folder);
  assert.ok(target.startsWith(root + sep) && /^editoria-(?:biblioteca|export)-/.test(basename(target)));
  await rm(target, { recursive: true, force: true });
}
test('aceita links de arquivo do Drive e recusa pastas/URLs inseguras', () => {
  assert.equal(driveLink(null), null);
  assert.equal(driveLink(drive + '?usp=sharing'), drive);
  assert.equal(driveLink('https://drive.google.com/open?id=ExampleFile_123456&resourcekey=test'), drive + '?resourcekey=test');
  for (const value of ['javascript:alert(1)', 'http://drive.google.com/file/d/ExampleFile_123456/view', 'https://drive.google.com.evil.test/file/d/ExampleFile_123456/view', 'https://drive.google.com/drive/folders/ExampleFile_123456', 'https://user:password@drive.google.com/file/d/ExampleFile_123456/view']) {
    assert.throws(() => driveLink(value));
  }
});

test('links por ID/nome; preferências não alteram catálogo; servidor só lê a biblioteca', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'editoria-biblioteca-'));
  let server;
  try {
    const source = { itens: [{ id: 'abc', tipo: 'video', nome: '</script><script>unsafe</script>', caminho: 'biblioteca/catalogo.json#abc' }] };
    const original = JSON.stringify(source);
    await writeFile(join(folder, 'catalogo.json'), original);
    await writeFile(join(folder, 'videos.json'), JSON.stringify({ abc: { arquivo: 'example.mp4', url: null } }));
    await writeFile(join(folder, 'index.html'), '<script type="application/json">/*__CATALOG__*/</script>');
    await writeFile(join(folder, 'alunos.js'), '/* fixture */');
    assert.equal((await catalog(folder)).itens[0].disponivel, false);
    assert.equal(await setLink('example.mp4', drive, folder), 'abc');
    assert.equal((await catalog(folder)).itens[0].video_url, drive);
    assert.equal((await catalog(folder)).itens[0].video_player_url, '/video/abc');
    assert.equal(await readFile(join(folder, 'catalogo.json'), 'utf8'), original);
    const before = await readFile(join(folder, 'videos.json'), 'utf8');
    await assert.rejects(() => setLink('not-found', drive, folder));
    await assert.rejects(() => setLink('abc', 'https://evil.test/video', folder));
    assert.equal(await readFile(join(folder, 'videos.json'), 'utf8'), before);
    server = createLibraryServer({ folder });
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(base), html = await response.text();
    assert.equal(response.status, 200);
    assert.ok(html.includes('\\u003c/script>'));
    assert.equal((await fetch(base + '/catalogo.json').then(r => r.json())).itens[0].video_url, drive);
    assert.equal((await fetch(base, { method: 'POST' })).status, 405);
    assert.equal((await fetch(base + '/marca/design.md')).status, 404);
    assert.equal((await fetch(base + '/%2e%2e/AGENTS.md')).status, 404);
    const badHost = await new Promise((resolve, reject) => {
      const call = request(base, { headers: { Host: 'evil.test' } }, response => { response.resume(); resolve(response.statusCode); });
      call.on('error', reject); call.end();
    });
    assert.equal(badHost, 403);
  } finally {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    await removeFixture(folder);
  }
});

test('player transmite intervalos de vídeo, confirma arquivos grandes e recusa respostas HTML', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'editoria-biblioteca-'));
  const id = 'a'.repeat(20), skillId = 'b'.repeat(20), calls = [];
  let server, mode = 'video';
  try {
    await writeFile(join(folder, 'catalogo.json'), JSON.stringify({ itens: [{ id, tipo: 'video' }, { id: skillId, tipo: 'skill' }] }));
    await writeFile(join(folder, 'videos.json'), JSON.stringify({ [id]: { arquivo: 'example.mp4', url: drive + '?resourcekey=test' } }));
    const fetchVideo = async (url, options) => {
      calls.push({ url: url.href, headers: options.headers });
      assert.equal(url.origin, 'https://drive.usercontent.google.com');
      assert.equal(url.searchParams.get('id'), 'ExampleFile_123456');
      assert.equal(url.searchParams.get('resourcekey'), 'test');
      assert.deepEqual(Object.keys(options.headers).sort(), ['Accept-Encoding', 'Range']);
      if (mode === 'large' && !url.searchParams.has('confirm')) {
        return new Response('<form id="download-form" action="https://untrusted.test/"><input name="id" value="OtherFile_123456"><input name="confirm" value="t"><input name="uuid" value="public-confirmation"></form>', { headers: { 'Content-Type': 'text/html' } });
      }
      if (mode === 'large') assert.equal(url.searchParams.get('uuid'), 'public-confirmation');
      if (mode === 'html') return new Response('<html>Access denied</html>', { headers: { 'Content-Type': 'text/html' } });
      if (options.headers.Range === 'bytes=99-') return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */10' } });
      assert.equal(options.headers.Range, 'bytes=2-5');
      return new Response(Buffer.from('2345'), { status: 206, headers: { 'Content-Type': 'video/mp4', 'Content-Range': 'bytes 2-5/10', 'Content-Length': '4', 'Content-Disposition': 'attachment' } });
    };
    server = createLibraryServer({ folder, fetchVideo });
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}/video/`;
    const response = await fetch(base + id, { headers: { Range: 'bytes=2-5' } });
    assert.equal(response.status, 206);
    assert.equal(response.headers.get('content-type'), 'video/mp4');
    assert.equal(response.headers.get('content-range'), 'bytes 2-5/10');
    assert.equal(response.headers.get('content-disposition'), null);
    assert.equal(await response.text(), '2345');
    const head = await fetch(base + id, { method: 'HEAD', headers: { Range: 'bytes=2-5' } });
    assert.equal(head.status, 206); assert.equal(await head.text(), '');
    const before = calls.length;
    assert.equal((await fetch(base + skillId)).status, 404);
    assert.equal((await fetch(base + 'c'.repeat(20))).status, 404);
    assert.equal((await fetch(base + id, { headers: { Range: 'items=0-3' } })).status, 416);
    assert.equal(calls.length, before);
    assert.equal((await fetch(base + id, { headers: { Range: 'bytes=99-' } })).headers.get('content-range'), 'bytes */10');
    mode = 'large';
    const large = await fetch(base + id, { headers: { Range: 'bytes=2-5' } });
    assert.equal(large.status, 206); assert.equal(await large.text(), '2345');
    assert.equal(new URL(calls.at(-1).url).searchParams.get('confirm'), 't');
    mode = 'html';
    const failure = await fetch(base + id, { headers: { Range: 'bytes=2-5' } });
    assert.equal(failure.status, 502); assert.ok(!(await failure.text()).includes('<html>'));
  } finally {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    await removeFixture(folder);
  }
});

test('exportação copia só capas; remove caminhos/histórico; preserva links já configurados', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'editoria-export-'));
  try {
    await mkdir(join(folder, 'scripts')); await mkdir(join(folder, 'source'));
    await mkdir(join(folder, 'biblioteca'));
    await mkdir(join(folder, 'biblioteca/posters'));
    await writeFile(join(folder, 'biblioteca/posters', 'd'.repeat(20) + '.jpg'), 'unused generated poster');
    await writeFile(join(folder, 'biblioteca/posters/custom.jpg'), 'unmanaged file');
    await copyFile(new URL('./exportar-biblioteca.mjs', import.meta.url), join(folder, 'scripts/exportar-biblioteca.mjs'));
    const id = 'a'.repeat(20);
    await writeFile(join(folder, 'biblioteca/videos.json'), JSON.stringify({ [id]: { url: drive } }));
    await writeFile(join(folder, 'source/poster.jpg'), 'fixture');
    const row = { id, tipo: 'video', nome: 'Estilo', caminho: 'C:/Users/private/clip.mp4', descricao: 'Veja https://example.com/style e /home/private/source', qualidade: 'bom', situacao: 'ativo',
      poster: 'poster.jpg', hash: 'f'.repeat(64), metadados: { duracao: 12, referencia_agente: { material: 'C:/Users/private/clip.mp4' } },
      evidencias_uso: [{ fonte: 'historico pessoal' }] };
    await writeFile(join(folder, 'source/feed.json'), JSON.stringify({ itens: [row, { ...row, id: 'b'.repeat(20), qualidade: 'ruim' }, { ...row, id: 'c'.repeat(20), situacao: 'na_lixeira' }] }));
    const result = spawnSync(process.execPath, [join(folder, 'scripts/exportar-biblioteca.mjs'), join(folder, 'source/feed.json')], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const text = await readFile(join(folder, 'biblioteca/catalogo.json'), 'utf8');
    assert.ok(!text.includes('C:/Users') && !text.includes('/home/private') && !text.includes('historico pessoal'));
    assert.ok(text.includes('https://example.com/style'));
    assert.equal(JSON.parse(text).itens.length, 1);
    assert.equal(JSON.parse(await readFile(join(folder, 'biblioteca/videos.json'), 'utf8'))[id].url, drive);
    assert.equal(await readFile(join(folder, 'biblioteca/posters', id + '.jpg'), 'utf8'), 'fixture');
    await assert.rejects(() => readFile(join(folder, 'biblioteca/posters', 'd'.repeat(20) + '.jpg')));
    assert.equal(await readFile(join(folder, 'biblioteca/posters/custom.jpg'), 'utf8'), 'unmanaged file');
    await assert.rejects(() => readFile(join(folder, 'biblioteca/clip.mp4')));
  } finally { await removeFixture(folder); }
});
