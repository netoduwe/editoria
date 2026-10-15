#!/usr/bin/env node
// Ferramenta do professor: traz vídeos novos do feed da curadoria para a biblioteca da turma.
// Mantém o que já foi escrito à mão (título, "o que aprender", estilo, links); copia só capas, nunca vídeos.
// Uso: node scripts/exportar-biblioteca.mjs <caminho-do-feed.json> [--substituir]
//   --substituir  tira da biblioteca os vídeos que não estão mais no feed (sem isso, só acrescenta e atualiza)
import { readFile, writeFile, mkdir, copyFile, realpath, readdir, unlink } from 'node:fs/promises';
import { resolve, dirname, basename, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const [input, flag] = process.argv.slice(2);
if (!input) { console.error('Uso: node scripts/exportar-biblioteca.mjs <caminho-do-feed.json> [--substituir]'); process.exit(1); }
const folder = resolve(dirname(fileURLToPath(import.meta.url)), '../biblioteca');
const source = resolve(input), sourceRoot = await realpath(dirname(source));
const feed = JSON.parse(await readFile(source, 'utf8'));
if (!Array.isArray(feed.itens)) throw new Error('O arquivo deve ser o feed selecionado, com uma lista itens.');
await mkdir(resolve(folder, 'posters'), { recursive: true });
const ler = async (arquivo, padrao) => { try { return JSON.parse(await readFile(resolve(folder, arquivo), 'utf8')); } catch (error) { if (error.code === 'ENOENT') return padrao; throw error; } };
const atual = await ler('catalogo.json', { itens: [] }), links = await ler('videos.json', {});
const curados = new Map((atual.itens || []).map(item => [item.id, item]));

const semCaminhos = value => String(value || '').replace(/(?<![A-Za-z])[A-Za-z]:[\\/][^\s"<>]+/g, '').replace(/(?:\/Users|\/home)\/[^\s"<>]+/g, '').trim();
const publicUrl = value => {
  if (!value) return null;
  try { const url = new URL(value); if (url.protocol !== 'https:' || url.username || url.password) return null; url.search = ''; url.hash = ''; return url.href; } catch { return null; }
};
const titulo = nome => { const t = semCaminhos(nome).replace(/\.(mp4|mov|webm)$/i, '').replace(/\d{3,4}x\d{3,4}/gi, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim(); return t.charAt(0).toLocaleUpperCase('pt-BR') + t.slice(1).toLocaleLowerCase('pt-BR'); };

const vistos = new Set(), itens = [];
for (const original of feed.itens) {
  if (original.tipo !== 'video' || original.qualidade === 'ruim' || (original.situacao || 'ativo') !== 'ativo') continue;
  if (!/^[a-f0-9]{20}$/.test(original.id)) throw new Error('ID inválido no feed.');
  const id = original.id, antes = curados.get(id) || {}, m = original.metadados || {};
  const url = publicUrl(m.url || (original.grupo === 'link' ? original.caminho : null));
  const drive = url && /^https:\/\/drive\.google\.com\/file\/d\//.test(url) ? url : null;
  const externo = url && !drive ? url : null;
  const item = {
    id, titulo: antes.titulo || titulo(original.nome),
    categoria: antes.categoria || (/motion|cta|vinheta|animatic/i.test(original.nome) ? 'motion' : 'edicao'),
    estilo: antes.estilo ?? null, aprender: antes.aprender || [],
    formato: antes.formato || (m.largura > m.altura ? '16:9' : '9:16'), duracao: antes.duracao ?? (m.duracao ? Number(Number(m.duracao).toFixed(1)) : null),
    poster: antes.poster || null,
  };
  const autor = antes.autor, linkOriginal = antes.link_original || externo;
  if (linkOriginal) Object.assign(item, autor ? { autor } : {}, { link_original: linkOriginal });
  if (original.poster) {
    const poster = await realpath(resolve(sourceRoot, original.poster));
    if (!poster.startsWith(sourceRoot + sep) || !poster.toLowerCase().endsWith('.jpg')) throw new Error('Capa fora da pasta do feed.');
    item.poster = `posters/${id}.jpg`;
    await copyFile(poster, resolve(folder, item.poster));
  }
  if (!linkOriginal) links[id] = { arquivo: basename(String(original.caminho || '').replaceAll('\\', '/')), url: links[id]?.url || drive || null };
  vistos.add(id); itens.push(item);
}
// Sem --substituir, itens que já estavam na biblioteca e não vieram no feed continuam, na ordem curada.
const final = flag === '--substituir' ? itens : [...(atual.itens || []).map(item => itens.find(n => n.id === item.id) || item), ...itens.filter(n => !curados.has(n.id))];
const ids = new Set(final.map(item => item.id));
for (const id of Object.keys(links)) if (!ids.has(id)) delete links[id];
const keep = new Set(final.map(item => item.poster).filter(Boolean).map(path => basename(path)));
const posterRoot = await realpath(resolve(folder, 'posters'));
for (const entry of await readdir(posterRoot, { withFileTypes: true })) {
  if (!entry.isFile() || !/^[a-f0-9]{20}\.jpg$/.test(entry.name) || keep.has(entry.name)) continue;
  const path = await realpath(resolve(posterRoot, entry.name));
  if (!path.startsWith(posterRoot + sep)) throw new Error('Capa fora da pasta de exportação.');
  await unlink(path);
}
await writeFile(resolve(folder, 'catalogo.json'), JSON.stringify({ schema_version: 2, atualizado_em: new Date().toISOString().slice(0, 10), itens: final }, null, 2) + '\n');
await writeFile(resolve(folder, 'videos.json'), JSON.stringify(links, null, 2) + '\n');
const semLink = Object.values(links).filter(l => !l.url).length, semTexto = final.filter(item => !item.aprender.length).length;
console.log(`${final.length} referências na biblioteca (${itens.filter(n => !curados.has(n.id)).length} novas). Nenhum vídeo foi copiado.`
  + (semLink ? ` ${semLink} aguardam link do Drive (node scripts/biblioteca.mjs vincular).` : '')
  + (semTexto ? ` ${semTexto} sem "o que aprender": complete em biblioteca/catalogo.json.` : ''));
