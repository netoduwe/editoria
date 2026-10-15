// Biblioteca do aluno: projetos guardados, pastas, ocultos, avaliações e lixeira.
// Tudo fica no computador do aluno (projetos/ e biblioteca/local/ estão fora do Git).
// Nunca toca entrada/: só mexe dentro de projetos/, saida/ e biblioteca/local/.
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { open, readFile, writeFile, rename, mkdir, readdir, stat, rm, realpath } from 'node:fs/promises';
import { join, resolve, relative, sep, basename, dirname } from 'node:path';

export const NOME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
export const ID_TURMA = /^[a-f0-9]{20}$/;
export const ID_PROJETO = /^projeto:([A-Za-z0-9][A-Za-z0-9._-]{0,99})$/;
export const ID_TEMPLATE = /^template:([a-z0-9][a-z0-9-]{0,59})$/;
const ITEM_LIXEIRA = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}__[0-9TZ-]{15,30}$/;
const CATEGORIAS = ['edicao', 'motion'];

export function caminhos(root) {
  return {
    projetos: join(root, 'projetos'), saida: join(root, 'saida'),
    lixeira: join(root, 'projetos', '.lixeira'), preferencias: join(root, 'biblioteca', 'local', 'preferencias.json'),
  };
}

function erro(mensagem, code = 'INVALIDO') { const e = new Error(mensagem); e.code = code; return e; }
const posix = p => p.split(sep).join('/');
const existe = async p => { try { await stat(p); return true; } catch { return false; } };

// Confere, depois de resolver links, que alvo fica dentro de base (e não é a própria base).
async function dentroDe(base, alvo) {
  try { const b = await realpath(base), a = await realpath(alvo); return a.startsWith(b + sep); } catch { return false; }
}

async function escreverJson(arquivo, dados) {
  await mkdir(dirname(arquivo), { recursive: true });
  const tmp = `${arquivo}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(dados, null, 2) + '\n');
  await rename(tmp, arquivo);
}

async function lerJson(arquivo) {
  try { return JSON.parse(await readFile(arquivo, 'utf8')); } catch { return null; }
}

// ---------- preferências: ocultos, avaliações e pastas ----------

const padrao = () => ({ schema_version: 1, versao: 0, ocultos: [], avaliacoes: {}, pastas: [] });
const idValido = v => typeof v === 'string' && (ID_TURMA.test(v) || ID_PROJETO.test(v) || ID_TEMPLATE.test(v));

export function validarPreferencias(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) throw erro('Preferências inválidas.');
  const lista = v => (v === undefined ? [] : Array.isArray(v) ? v : (() => { throw erro('Lista inválida nas preferências.'); })());
  const ocultos = [...new Set(lista(p.ocultos))];
  if (ocultos.length > 5000 || !ocultos.every(idValido)) throw erro('Item oculto inválido.');
  const avaliacoes = {};
  const brutas = p.avaliacoes ?? {};
  if (typeof brutas !== 'object' || Array.isArray(brutas)) throw erro('Avaliações inválidas.');
  for (const [id, valor] of Object.entries(brutas)) {
    if (!idValido(id) || !['bom', 'ruim'].includes(valor)) throw erro('Avaliação inválida.');
    avaliacoes[id] = valor;
  }
  const nomes = new Set();
  const pastas = lista(p.pastas).map(pasta => {
    if (!pasta || typeof pasta !== 'object') throw erro('Pasta inválida.');
    const nome = String(pasta.nome ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
    if (!nome || nome.length > 40) throw erro('O nome da pasta precisa ter de 1 a 40 caracteres.');
    if (nomes.has(nome.toLocaleLowerCase('pt-BR'))) throw erro(`Já existe uma pasta chamada "${nome}".`);
    nomes.add(nome.toLocaleLowerCase('pt-BR'));
    const id = typeof pasta.id === 'string' && /^[a-z0-9-]{1,40}$/.test(pasta.id) ? pasta.id : novoIdPasta();
    const itens = [...new Set(lista(pasta.itens))];
    if (itens.length > 2000 || !itens.every(idValido)) throw erro('Item inválido na pasta.');
    return { id, nome, itens };
  });
  if (pastas.length > 60) throw erro('Limite de 60 pastas.');
  return { schema_version: 1, versao: Number.isInteger(p.versao) ? p.versao : 0, ocultos, avaliacoes, pastas };
}

export const novoIdPasta = () => 'pasta-' + randomUUID().slice(0, 8);

export async function lerPreferencias(root) {
  const dados = await lerJson(caminhos(root).preferencias);
  if (!dados) return padrao();
  try { return { ...validarPreferencias(dados), atualizado_em: dados.atualizado_em ?? null }; } catch { return padrao(); }
}

// Grava só se ninguém mudou o arquivo desde a leitura (a página e o agente podem escrever).
export async function salvarPreferencias(root, preferencias, versaoBase) {
  const atual = await lerPreferencias(root);
  if (versaoBase !== atual.versao) throw erro('Sua biblioteca mudou em outro lugar. Recarregue e tente de novo.', 'CONFLITO');
  const limpo = validarPreferencias(preferencias);
  limpo.versao = atual.versao + 1;
  limpo.atualizado_em = new Date().toISOString();
  await escreverJson(caminhos(root).preferencias, limpo);
  return limpo;
}

export async function alterarPreferencias(root, alterar) {
  const p = await lerPreferencias(root);
  alterar(p);
  return salvarPreferencias(root, p, p.versao);
}

export function adicionarNaPasta(p, nomePasta, ids, remover = false) {
  const nome = String(nomePasta).trim();
  let pasta = p.pastas.find(f => f.nome.toLocaleLowerCase('pt-BR') === nome.toLocaleLowerCase('pt-BR'));
  if (!pasta) {
    if (remover) throw erro(`Não existe a pasta "${nome}".`);
    pasta = { id: novoIdPasta(), nome, itens: [] }; p.pastas.push(pasta);
  }
  for (const id of ids) {
    if (!idValido(id)) throw erro(`ID inválido: ${id}`);
    pasta.itens = remover ? pasta.itens.filter(x => x !== id) : [...new Set([...pasta.itens, id])];
  }
  return pasta;
}

// ---------- projetos guardados ----------

async function pastaDoProjeto(root, alvo) {
  const { projetos } = caminhos(root);
  const texto = String(alvo || '').replace(/[\\/]+$/, '');
  const dir = NOME.test(texto) ? join(projetos, texto) : resolve(root, texto);
  const nome = basename(dir);
  if (!NOME.test(nome) || relative(projetos, dir) !== nome) throw erro('Informe um projeto dentro de projetos/ (ex.: projetos/meu-video).');
  if (!(await dentroDe(projetos, dir))) throw erro(`Não achei a pasta projetos/${nome}.`, 'NAO_ENCONTRADO');
  return { dir, nome };
}

function sondar(video) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', video], { encoding: 'utf8' });
  const p = JSON.parse(r.stdout || '{}');
  const v = p.streams?.find(s => s.codec_type === 'video');
  if (!v || !p.format) throw erro(`Não consegui ler o vídeo ${video}.`);
  const rot = Math.abs(Number(v.side_data_list?.find(d => d.rotation !== undefined)?.rotation ?? v.tags?.rotate ?? 0));
  const [w, h] = rot === 90 || rot === 270 ? [v.height, v.width] : [v.width, v.height];
  return { duracao: Number(Number(p.format.duration).toFixed(2)), largura: w, altura: h };
}

function formato(w, h) {
  const r = w / h;
  for (const [nome, alvo] of [['9:16', 9 / 16], ['16:9', 16 / 9], ['4:5', 4 / 5], ['1:1', 1], ['3:4', 3 / 4]]) if (Math.abs(r - alvo) < 0.02) return nome;
  return `${w}x${h}`;
}

function ffmpeg(args) {
  const r = spawnSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw erro('O FFmpeg falhou: ' + (r.stderr || '').trim().split('\n').slice(-2).join(' '));
}

// Assinatura leve do bruto: tamanho + hash do começo e do fim (brutos podem ter vários GB).
async function assinatura(arquivo) {
  const { size } = await stat(arquivo);
  const h = createHash('sha256'), bloco = 4 * 1024 * 1024, fh = await open(arquivo, 'r');
  try {
    for (const inicio of size > 2 * bloco ? [0, size - bloco] : [0]) {
      const buf = Buffer.alloc(Math.min(bloco, size)); await fh.read(buf, 0, buf.length, inicio); h.update(buf);
    }
  } finally { await fh.close(); }
  return { tamanho: size, assinatura: h.digest('hex').slice(0, 32) };
}

const tituloDoNome = nome => {
  const t = nome.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return t.charAt(0).toLocaleUpperCase('pt-BR') + t.slice(1);
};

export async function lerProjeto(dir) {
  const info = await lerJson(join(dir, 'projeto.json'));
  return info && typeof info === 'object' && !Array.isArray(info) ? info : null;
}

// Registra o projeto na biblioteca do aluno: capa + prévia leve + projeto.json. Não apaga nada
// (a não ser com compactar). Pode rodar de novo a cada nova versão.
export async function guardarProjeto(root, alvo, opcoes = {}) {
  const { dir, nome } = await pastaDoProjeto(root, alvo);
  const { saida, projetos } = caminhos(root);
  const atual = (await lerProjeto(dir)) || {};
  const candidatos = opcoes.video ? [resolve(root, opcoes.video)] : [join(saida, `${nome}.mp4`), join(dir, 'render.mp4')];
  let video = null;
  for (const c of candidatos) if (await existe(c)) { video = c; break; }
  if (!video) throw erro(`Não achei o vídeo final de ${nome}. Use --video saida/<arquivo>.mp4.`, 'NAO_ENCONTRADO');
  if (!(await dentroDe(saida, video)) && !(await dentroDe(projetos, video))) throw erro('O vídeo final precisa estar em saida/ ou projetos/.');

  const meta = sondar(video);
  const vertical = meta.altura >= meta.largura;
  const capaEm = Number.isFinite(Number(opcoes.capa)) ? Number(opcoes.capa) : Math.min(1, meta.duracao / 2);
  ffmpeg(['-ss', String(capaEm), '-i', video, '-frames:v', '1', '-vf', vertical ? 'scale=270:-2' : 'scale=480:-2', '-q:v', '4', join(dir, 'capa.jpg')]);
  const tmp = join(dir, 'previa.tmp.mp4');
  ffmpeg(['-i', video, '-vf', vertical ? 'scale=540:-2' : 'scale=960:-2', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28',
    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-ac', '2', '-movflags', '+faststart', tmp]);
  await rename(tmp, join(dir, 'previa.mp4'));

  let bruto = atual.bruto ?? null;
  const fonte = opcoes.bruto || (await lerJson(join(dir, 'corte.mapa.json')))?.fonte;
  if (fonte) {
    const caminho = resolve(root, fonte);
    bruto = (await existe(caminho)) ? { caminho: posix(relative(root, caminho)), ...(await assinatura(caminho)) } : { caminho: posix(fonte), tamanho: null, assinatura: null };
  }
  const notas = opcoes.notas ? String(opcoes.notas).split(';').map(s => s.trim()).filter(Boolean).slice(0, 4) : null;
  const categoria = CATEGORIAS.includes(opcoes.categoria) ? opcoes.categoria : atual.categoria
    || ((await existe(join(dir, 'edl.json'))) || (await existe(join(dir, 'corte.mapa.json'))) ? 'edicao' : 'motion');
  const agora = new Date().toISOString();
  const info = {
    ...atual, schema_version: 1, guardado: true, nome,
    titulo: String(opcoes.titulo || atual.titulo || tituloDoNome(nome)).slice(0, 120),
    categoria, estilo: opcoes.estilo ?? atual.estilo ?? null, referencia: opcoes.referencia ?? atual.referencia ?? null,
    aprender: notas ?? atual.aprender ?? [],
    formato: formato(meta.largura, meta.altura), duracao: meta.duracao,
    video_final: posix(relative(root, video)), bruto,
    criado_em: atual.criado_em || agora, atualizado_em: agora, compactado: atual.compactado ?? false,
  };
  await escreverJson(join(dir, 'projeto.json'), info);
  if (opcoes.pasta) await alterarPreferencias(root, p => adicionarNaPasta(p, opcoes.pasta, [`projeto:${nome}`]));
  const resultado = { nome, titulo: info.titulo, previa_mb: Number(((await stat(join(dir, 'previa.mp4'))).size / 1048576).toFixed(1)) };
  if (opcoes.compactar) resultado.compactacao = await compactarProjeto(root, nome);
  return resultado;
}

// Arquivos pesados que dá para gerar de novo a partir do bruto + edl.json + composição.
const REGENERAVEIS = ['corte.mp4', 'render.mp4', 'composicao/assets/corte.mp4', 'composicao/assets/pessoa.webm', 'composicao/.hyperframes', '.hyperframes'];

async function tamanho(p) {
  const s = await stat(p);
  if (!s.isDirectory()) return s.size;
  let total = 0;
  for (const e of await readdir(p)) total += await tamanho(join(p, e));
  return total;
}

export async function compactarProjeto(root, alvo) {
  const { dir, nome } = await pastaDoProjeto(root, alvo);
  const info = await lerProjeto(dir);
  if (!info?.guardado || !(await existe(join(dir, 'previa.mp4')))) throw erro('Guarde o projeto antes de compactar (ele precisa da prévia).');
  let liberado = 0; const removidos = [];
  for (const rel of REGENERAVEIS) {
    const p = join(dir, ...rel.split('/'));
    if (!(await existe(p)) || !(await dentroDe(dir, p))) continue;
    liberado += await tamanho(p); await rm(p, { recursive: true, force: true }); removidos.push(rel);
  }
  const para_reabrir = [];
  if (removidos.includes('corte.mp4') || removidos.includes('composicao/assets/corte.mp4')) {
    para_reabrir.push(info.bruto?.caminho
      ? `node scripts/cortar.mjs ${info.bruto.caminho} projetos/${nome}/edl.json projetos/${nome}/corte.mp4`
      : 'refazer o corte a partir do bruto e do edl.json');
    if (await existe(join(dir, 'composicao'))) para_reabrir.push(`copiar projetos/${nome}/corte.mp4 para projetos/${nome}/composicao/assets/corte.mp4`);
  }
  if (removidos.includes('composicao/assets/pessoa.webm')) para_reabrir.push(`npx hyperframes remove-background projetos/${nome}/composicao/assets/corte.mp4 -o projetos/${nome}/composicao/assets/pessoa.webm`);
  if (removidos.length) await escreverJson(join(dir, 'projeto.json'), { ...info, compactado: true, para_reabrir: [...new Set([...(info.para_reabrir || []), ...para_reabrir])] });
  // O que ainda é grande fica listado para o agente decidir com o aluno.
  const grandes = [];
  async function varrer(p) {
    for (const e of await readdir(p, { withFileTypes: true })) {
      const q = join(p, e.name);
      if (e.isDirectory()) await varrer(q); else { const s = (await stat(q)).size; if (s > 20 * 1048576 && e.name !== 'previa.mp4') grandes.push(`${posix(relative(dir, q))} (${(s / 1048576).toFixed(0)} MB)`); }
    }
  }
  await varrer(dir);
  return { removidos, liberado_mb: Number((liberado / 1048576).toFixed(1)), ainda_grandes: grandes };
}

export async function listarProjetos(root) {
  const { projetos } = caminhos(root);
  let entradas = [];
  try { entradas = await readdir(projetos, { withFileTypes: true }); } catch (e) { if (e.code === 'ENOENT') return []; throw e; }
  const lista = [];
  for (const e of entradas) {
    if (!e.isDirectory() || !NOME.test(e.name)) continue;
    const dir = join(projetos, e.name), info = await lerProjeto(dir);
    if (!info?.guardado) continue;
    lista.push(await itemDoProjeto(dir, e.name, info, `/meus/${encodeURIComponent(e.name)}`));
  }
  return lista.sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)));
}

async function itemDoProjeto(dir, nome, info, base) {
  const capa = await stat(join(dir, 'capa.jpg')).catch(() => null);
  const previa = await existe(join(dir, 'previa.mp4'));
  return {
    id: `projeto:${nome}`, tipo: 'projeto', nome, caminho: `projetos/${nome}`,
    titulo: String(info.titulo || tituloDoNome(nome)), categoria: CATEGORIAS.includes(info.categoria) ? info.categoria : 'edicao',
    estilo: typeof info.estilo === 'string' ? info.estilo : null, referencia: info.referencia ?? null,
    aprender: Array.isArray(info.aprender) ? info.aprender.map(String).slice(0, 4) : [],
    formato: info.formato ?? null, duracao: Number(info.duracao) || null, criado_em: info.criado_em ?? null,
    video_final: info.video_final ?? null, compactado: Boolean(info.compactado),
    poster: capa ? `${base}/capa.jpg?v=${Math.round(capa.mtimeMs)}` : null, video: previa ? `${base}/previa.mp4` : null,
  };
}

// ---------- lixeira ----------

export async function excluirProjeto(root, alvo, { comVideo = false } = {}) {
  const { dir, nome } = await pastaDoProjeto(root, alvo);
  const { lixeira, saida } = caminhos(root);
  const info = (await lerProjeto(dir)) || {};
  const item = `${nome}__${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const destino = join(lixeira, item);
  await mkdir(lixeira, { recursive: true });
  await mover(dir, destino);
  const movidos = [];
  if (comVideo && typeof info.video_final === 'string') {
    const final = resolve(root, info.video_final), base = final.replace(/\.[^.\\/]+$/, '');
    for (const arquivo of [final, `${base}.srt`, `${base}.folha.jpg`]) {
      if (!(await dentroDe(saida, arquivo))) continue;
      await mkdir(join(destino, '_saida'), { recursive: true });
      await mover(arquivo, join(destino, '_saida', basename(arquivo)));
      movidos.push(posix(relative(root, arquivo)));
    }
  }
  await escreverJson(join(destino, 'lixeira.json'), { nome, titulo: info.titulo ?? tituloDoNome(nome), excluido_em: new Date().toISOString(), saida: movidos });
  return { item, nome, saida: movidos };
}

// No Windows, um arquivo aberto (vídeo tocando) impede mover; tenta de novo por alguns segundos.
async function mover(de, para) {
  for (let tentativa = 0; ; tentativa++) {
    try { await rename(de, para); return; } catch (e) {
      if (!['EBUSY', 'EPERM', 'EACCES'].includes(e.code) || tentativa >= 10) {
        if (['EBUSY', 'EPERM', 'EACCES'].includes(e.code)) throw erro('O arquivo está em uso. Feche o vídeo e tente de novo.', 'EM_USO');
        throw e;
      }
      await new Promise(r => setTimeout(r, 300));
    }
  }
}

async function entradaDaLixeira(root, item) {
  const { lixeira } = caminhos(root);
  if (!ITEM_LIXEIRA.test(String(item))) throw erro('Item da lixeira inválido.');
  const dir = join(lixeira, item);
  if (!(await dentroDe(lixeira, dir))) throw erro('Esse item não está na lixeira.', 'NAO_ENCONTRADO');
  return dir;
}

export async function listarLixeira(root) {
  const { lixeira } = caminhos(root);
  let entradas = [];
  try { entradas = await readdir(lixeira, { withFileTypes: true }); } catch (e) { if (e.code === 'ENOENT') return []; throw e; }
  const lista = [];
  for (const e of entradas) {
    if (!e.isDirectory() || !ITEM_LIXEIRA.test(e.name)) continue;
    const dir = join(lixeira, e.name), info = (await lerProjeto(dir)) || {}, nota = (await lerJson(join(dir, 'lixeira.json'))) || {};
    const item = await itemDoProjeto(dir, nota.nome || e.name.split('__')[0], { ...info, titulo: info.titulo || nota.titulo }, `/lixeira/${encodeURIComponent(e.name)}`);
    lista.push({ ...item, id: `lixeira:${e.name}`, tipo: 'lixeira', item: e.name, video: null, excluido_em: nota.excluido_em ?? null, saida: nota.saida ?? [] });
  }
  return lista.sort((a, b) => String(b.excluido_em).localeCompare(String(a.excluido_em)));
}

export async function restaurarProjeto(root, item) {
  const { projetos, lixeira, saida } = caminhos(root);
  let dir;
  if (ITEM_LIXEIRA.test(String(item))) dir = await entradaDaLixeira(root, item);
  else {
    const nome = String(item); // aceita o nome do projeto: restaura o excluído mais recente
    const achado = (await listarLixeira(root)).find(x => x.nome === nome);
    if (!achado) throw erro(`Não há "${nome}" na lixeira.`, 'NAO_ENCONTRADO');
    dir = join(lixeira, achado.item);
  }
  const nota = (await lerJson(join(dir, 'lixeira.json'))) || {};
  const original = NOME.test(nota.nome || '') ? nota.nome : basename(dir).split('__')[0];
  let nome = original, n = 2;
  while (await existe(join(projetos, nome))) nome = `${original}-${n++}`;
  const devolvidos = [];
  if (await existe(join(dir, '_saida'))) {
    await mkdir(saida, { recursive: true });
    for (const arquivo of await readdir(join(dir, '_saida'))) {
      let alvo = join(saida, arquivo), k = 2;
      while (await existe(alvo)) alvo = join(saida, arquivo.replace(/(\.[^.]+)$/, `-${k++}$1`));
      await mover(join(dir, '_saida', arquivo), alvo); devolvidos.push(posix(relative(root, alvo)));
    }
    await rm(join(dir, '_saida'), { recursive: true, force: true });
  }
  await rm(join(dir, 'lixeira.json'), { force: true });
  await mover(dir, join(projetos, nome));
  if (nome !== original) {
    const info = await lerProjeto(join(projetos, nome));
    if (info) await escreverJson(join(projetos, nome, 'projeto.json'), { ...info, nome });
  }
  return { nome, saida: devolvidos };
}

export async function esvaziarLixeira(root, item) {
  const { lixeira } = caminhos(root);
  const itens = item ? [item] : (await listarLixeira(root)).map(x => x.item);
  for (const i of itens) await rm(await entradaDaLixeira(root, i), { recursive: true, force: true });
  if (!item && (await existe(lixeira)) && (await readdir(lixeira)).length === 0) await rm(lixeira, { recursive: true, force: true });
  return { apagados: itens.length };
}

