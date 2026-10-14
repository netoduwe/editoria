#!/usr/bin/env node
// Ferramenta do professor: exporta somente metadados e capas do feed selecionado.
import { readFile, writeFile, mkdir, copyFile, realpath, readdir, unlink } from 'node:fs/promises';
import { resolve, dirname, basename, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const input = process.argv[2];
if (!input) { console.error('Uso: node scripts/exportar-biblioteca.mjs <caminho-do-feed.json>'); process.exit(1); }
const folder = resolve(dirname(fileURLToPath(import.meta.url)), '../biblioteca');
const source = resolve(input), sourceRoot = await realpath(dirname(source));
const feed = JSON.parse(await readFile(source, 'utf8'));
if (!Array.isArray(feed.itens)) throw new Error('O arquivo deve ser o feed selecionado, com uma lista itens.');
await mkdir(resolve(folder, 'posters'), { recursive: true });
let previous = {};
try { previous = JSON.parse(await readFile(resolve(folder, 'videos.json'), 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const links = {}, rows = [];
const publicText = value => String(value || '').replace(/(?<![A-Za-z])[A-Za-z]:[\\/][^\s"<>]+/g, '[caminho local]').replace(/(?:\/Users|\/home)\/[^\s"<>]+/g, '[caminho local]');
const publicUrl = value => {
  if (!value) return null;
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  url.search = ''; url.hash = ''; return url.href;
};
for (const original of feed.itens) {
  if (original.qualidade === 'ruim' || (original.situacao || 'ativo') !== 'ativo') continue;
  if (!/^[a-f0-9]{20}$/.test(original.id)) throw new Error('ID inválido no feed.');
  const id = original.id, video = original.tipo === 'video';
  const url = publicUrl(original.metadados?.url || (original.grupo === 'link' ? original.caminho : null));
  const type = original.tipo === 'template' ? 'referencia' : original.tipo;
  const row = {
    id, tipo: type, nome: publicText(original.nome), caminho: url || `biblioteca/catalogo.json#${id}`, caminho_relativo: null,
    descricao: original.tipo === 'template' ? 'Referência visual de composição. A fonte editável original não acompanha esta biblioteca.' : publicText(original.descricao),
    criado_em: null, modificado_em: null, tamanho: video ? original.tamanho : null, hash: video ? original.hash : null, duplicado_de: null,
    origem: video || original.poster ? 'Referências de vídeo e motion' : 'Ferramentas de vídeo e motion',
    depende_de: [], arquivos_relacionados: [], uso: 'sem_registro', ultima_vez_usado: null, vezes_usado: 0, evidencias_uso: [], mencoes: [],
    qualidade: original.qualidade === 'bom' ? 'bom' : 'a_avaliar', motivo: original.qualidade === 'bom' ? 'Referência aprovada na curadoria.' : 'Referência para estudo. Avalie se este estilo atende ao seu vídeo.',
    fonte_veredito: 'curadoria', data_veredito: null, grupo: type === 'repo' ? 'repositorio' : url ? 'link' : 'acervo', escopo: 'biblioteca',
    disponivel: false, familia: null, versao: original.versao || null, status_versao: video ? 'final' : null, final_confirmado: Boolean(video && original.final_confirmado),
    poster: null, metadados: { url, duracao: original.metadados?.duracao || null, largura: original.metadados?.largura || null, altura: original.metadados?.altura || null }
  };
  if (original.poster) {
    const poster = await realpath(resolve(sourceRoot, original.poster));
    if (!poster.startsWith(sourceRoot + sep) || !poster.toLowerCase().endsWith('.jpg')) throw new Error('Poster fora da pasta do feed.');
    row.poster = `posters/${id}.jpg`;
    await copyFile(poster, resolve(folder, row.poster));
  }
  if (video) links[id] = { arquivo: basename(original.caminho.replaceAll('\\', '/')), url: previous[id]?.url || null };
  rows.push(row);
}
const counters = key => rows.reduce((result, row) => (result[row[key]] = (result[row[key]] || 0) + 1, result), {});
const data = { schema_version: 1, raiz: 'editoria-biblioteca-v1', gerado_em: feed.gerado_em,
  itens: rows, contagem: Object.fromEntries(['tipo', 'qualidade', 'uso', 'grupo'].map(key => [key, counters(key)])),
  cobertura: { chats_snapshot: 0, chats_app: 0 } };
// Remove only generated posters whose references left this selected snapshot.
const keep = new Set(rows.map(row => row.poster).filter(Boolean).map(path => basename(path)));
const posterRoot = await realpath(resolve(folder, 'posters'));
for (const entry of await readdir(posterRoot, { withFileTypes: true })) {
  if (!entry.isFile() || !/^[a-f0-9]{20}\.jpg$/.test(entry.name) || keep.has(entry.name)) continue;
  const path = await realpath(resolve(posterRoot, entry.name));
  if (!path.startsWith(posterRoot + sep)) throw new Error('Poster fora da pasta de exportação.');
  await unlink(path);
}
await writeFile(resolve(folder, 'catalogo.json'), JSON.stringify(data, null, 2) + '\n');
await writeFile(resolve(folder, 'videos.json'), JSON.stringify(links, null, 2) + '\n');
console.log(`${rows.length} referências exportadas; ${Object.keys(links).length} vídeos aguardam links em biblioteca/videos.json. Nenhum vídeo foi copiado.`);
