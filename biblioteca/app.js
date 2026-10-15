'use strict';
// Feed único: referências da turma + projetos guardados do aluno, com pastas e lixeira.
// As escolhas do aluno (pastas, avaliações, ocultos) ficam em biblioteca/local/, no computador dele.
const BOOT = (() => { try { return JSON.parse(document.getElementById('boot').textContent); } catch { return {}; } })();
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sel = id => `.card[data-id="${CSS.escape(id)}"]`;
const TIPO = { edicao: 'Edição falada', motion: 'Motion' };
const state = { aba: 'tudo', vista: 'ativos', busca: '', ordem: 'destaque', limite: 48, filtro: { categoria: '', formato: '', estilo: '', boas: false } };
let dados = { turma: [], meus: [], lixeira: [], preferencias: { versao: 0, ocultos: [], avaliacoes: {}, pastas: [] }, estado: '' };
let player = null, toastTimer = null;

// ---------- dados ----------

async function carregar() {
  const r = await fetch('/api/biblioteca', { cache: 'no-store' });
  if (!r.ok) throw new Error('Não foi possível ler a biblioteca.');
  dados = await r.json();
  render();
}

async function api(caminho, corpo) {
  const r = await fetch(caminho, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Biblioteca-Token': BOOT.token || '' }, body: JSON.stringify(corpo) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.erro || 'Não foi possível concluir.'), { status: r.status });
  return j;
}

// Aplica a mudança sobre a versão mais nova: se o agente mexeu no arquivo, recarrega e tenta de novo.
async function mudar(alterar) {
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const p = structuredClone(dados.preferencias);
    alterar(p);
    try {
      dados.preferencias = (await api('/api/preferencias', { versao: dados.preferencias.versao, preferencias: p })).preferencias;
      render(); return true;
    } catch (e) {
      if (e.status === 409 && tentativa === 0) { await carregar(); continue; }
      toast(e.message); return false;
    }
  }
  return false;
}

// Marcações da versão anterior do feed (guardadas no navegador) passam para o arquivo local uma vez.
async function migrarDoNavegador() {
  try {
    if (localStorage.getItem('editor-ia-biblioteca-migrado')) return;
    const base = 'editor-ia-curadoria-v1:editoria-biblioteca-v1';
    const marcas = JSON.parse(localStorage.getItem(base) || '{}'), ocultos = JSON.parse(localStorage.getItem(base + ':ocultos') || '[]');
    const ids = new Set(dados.turma.map(i => i.id));
    const novosOcultos = (Array.isArray(ocultos) ? ocultos : []).filter(id => ids.has(id));
    const novas = Object.entries(marcas || {}).filter(([id, m]) => ids.has(id) && ['bom', 'ruim'].includes(m?.qualidade));
    if (novosOcultos.length || novas.length) {
      const ok = await mudar(p => {
        p.ocultos = [...new Set([...p.ocultos, ...novosOcultos])];
        for (const [id, m] of novas) if (!p.avaliacoes[id]) p.avaliacoes[id] = m.qualidade;
      });
      if (!ok) return;
    }
    localStorage.setItem('editor-ia-biblioteca-migrado', '1');
  } catch { /* navegador sem armazenamento: nada a migrar */ }
}

const todos = () => [...dados.meus, ...dados.turma];
const porId = id => todos().find(i => i.id === id) || dados.lixeira.find(i => i.id === id);
const oculto = id => dados.preferencias.ocultos.includes(id);
const pasta = id => dados.preferencias.pastas.find(f => f.id === id);
const visiveis = () => todos().filter(i => !oculto(i.id));

// ---------- feed ----------

function lista() {
  const f = state.filtro, q = state.busca.toLocaleLowerCase('pt-BR');
  let itens;
  if (state.vista === 'removidos') itens = [...dados.lixeira, ...dados.turma.filter(i => oculto(i.id))];
  else if (state.aba === 'meus') itens = dados.meus.filter(i => !oculto(i.id));
  else if (pasta(state.aba)) { const ids = pasta(state.aba).itens; itens = visiveis().filter(i => ids.includes(i.id)); }
  else itens = visiveis();
  itens = itens.filter(i => (!f.categoria || i.categoria === f.categoria) && (!f.formato || i.formato === f.formato)
    && (!f.estilo || i.estilo === f.estilo) && (!f.boas || dados.preferencias.avaliacoes[i.id] === 'bom')
    && (!q || [i.titulo, i.estilo, i.autor, TIPO[i.categoria], ...(i.aprender || [])].join(' ').toLocaleLowerCase('pt-BR').includes(q)));
  if (state.ordem === 'nome') itens.sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
  else if (state.ordem === 'curtos') itens.sort((a, b) => (a.duracao || 999) - (b.duracao || 999));
  return itens;
}

const duracao = s => (s ? Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') : '');
const icone = '<svg viewBox="0 0 52 52" fill="none" stroke="currentColor" aria-hidden="true"><rect x="7" y="7" width="38" height="38" rx="4"/><path d="m21 18 14 8-14 8z"/></svg>';

function cartao(item) {
  const id = esc(item.id), nome = esc(item.titulo), podeTocar = item.video || item.embed;
  const removidos = state.vista === 'removidos', lixo = item.tipo === 'lixeira';
  const img = item.poster ? `<img loading="lazy" decoding="async" src="${esc(item.poster)}" alt="">` : `<div class="placeholder">${icone}<span>${esc(TIPO[item.categoria] || 'Projeto')}</span></div>`;
  const poster = podeTocar && !removidos
    ? `<button class="poster" data-assistir="${id}" aria-label="Assistir ${nome}">${img}${item.duracao ? `<span class="duration">${duracao(item.duracao)}</span>` : ''}<span class="play-label"><svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="m3 1 8 5-8 5z"/></svg>Assistir</span></button>`
    : `<button class="poster" data-detalhes="${id}" aria-label="Ver ${nome}">${img}${item.duracao ? `<span class="duration">${duracao(item.duracao)}</span>` : ''}</button>`;
  return `<article class="card" data-id="${id}" data-kind="${esc(item.tipo)}">${poster}<div class="card-body">${corpoDoCartao(item, removidos, lixo)}</div></article>`;
}

function corpoDoCartao(item, removidos, lixo) {
  const id = esc(item.id), nome = esc(item.titulo), nota = dados.preferencias.avaliacoes[item.id];
  const origem = item.tipo === 'turma' ? (item.autor ? `${esc(item.autor)} · Instagram` : 'Da turma') : lixo ? 'Na lixeira' : 'Meu projeto';
  let menu = `<button data-detalhes="${id}">Ver detalhes</button>`;
  if (!removidos) {
    menu += `<span class="menu-label">Avaliação</span><div class="actions" role="group" aria-label="Avaliar ${nome}">`
      + [['bom', 'Boa referência'], ['ruim', 'Não curti']].map(([v, l]) => `<button data-avaliar="${id}" data-valor="${v}" class="${nota === v ? 'chosen-' + v : ''}" aria-pressed="${nota === v}">${l}</button>`).join('') + '</div>'
      + `<span class="menu-label">Pastas</span><div class="folder-list">`
      + dados.preferencias.pastas.map(f => { const dentro = f.itens.includes(item.id); return `<button class="folder-toggle" data-pasta="${esc(f.id)}" data-item="${id}" aria-pressed="${dentro}"><span aria-hidden="true">${dentro ? '✓' : '+'}</span>${esc(f.nome)}</button>`; }).join('')
      + `<button class="folder-toggle" data-nova-pasta="${id}"><span aria-hidden="true">＋</span>Nova pasta…</button></div>`
      + (item.tipo === 'projeto' ? `<button class="remove-action" data-excluir="${id}">Excluir projeto…</button>` : `<button class="remove-action" data-ocultar="${id}">Remover da minha biblioteca</button>`);
  } else if (lixo) menu += `<button class="remove-action" data-apagar="${esc(item.item)}">Apagar de vez…</button>`;
  const acao = removidos
    ? (lixo ? `<button class="reference-action" data-restaurar="${esc(item.item)}">Restaurar projeto <span aria-hidden="true">↩</span></button>` : `<button class="reference-action" data-mostrar="${id}">Restaurar na minha biblioteca <span aria-hidden="true">↩</span></button>`)
    : `<button class="reference-action" data-usar="${id}">Usar como referência <span aria-hidden="true">↗</span></button>`;
  return `<div class="card-heading"><h2 title="${nome}">${nome}</h2><details class="card-menu"><summary aria-label="Mais opções para ${nome}">⋯</summary><div class="card-menu-panel">${menu}</div></details></div>`
    + `<div class="card-meta"><span>${esc(TIPO[item.categoria] || '')}${item.estilo ? ' · ' + esc(item.estilo) : ''}</span>${nota === 'bom' ? '<span class="picked">Boa referência ✓</span>' : `<span>${origem}</span>`}</div>`
    + `<p class="learn" title="${esc((item.aprender || []).join(' · '))}">${esc(item.aprender?.[0] || (item.tipo === 'projeto' ? item.caminho : ''))}</p>` + acao;
}

function render() {
  renderAbas(); renderFiltros();
  const itens = lista(), mostrados = itens.slice(0, state.limite);
  const ativo = player && mostrados.some(i => i.id === player.id) ? player : null;
  if (player && !ativo) parar();
  const grade = $('#grade');
  if (!mostrados.length) { grade.innerHTML = `<div class="empty">${vazio()}</div>`; }
  else if (!ativo) grade.innerHTML = mostrados.map(cartao).join('');
  else {
    // O card que está tocando nunca sai da página: só o texto dele é atualizado e os outros são refeitos em volta.
    const card = ativo.stage.closest('.card'), i = mostrados.findIndex(x => x.id === ativo.id);
    const montar = arr => { const t = document.createElement('template'); t.innerHTML = arr.map(cartao).join(''); return [...t.content.childNodes]; };
    for (const filho of [...grade.childNodes]) if (filho !== card) filho.remove();
    card.before(...montar(mostrados.slice(0, i))); card.after(...montar(mostrados.slice(i + 1)));
    card.querySelector('.card-body').innerHTML = corpoDoCartao(mostrados[i], false, false);
    const original = document.createElement('template'); original.innerHTML = cartao(mostrados[i]);
    ativo.poster = original.content.querySelector('.poster');
  }
  $('#contagem').innerHTML = `<b>${itens.length}</b> ${itens.length === 1 ? 'item' : 'itens'}${state.limite < itens.length ? ` · ${state.limite} na tela` : ''}`;
  $('#mais').hidden = state.limite >= itens.length;
  const f = pasta(state.aba);
  $('#acoes-da-aba').innerHTML = state.vista === 'removidos'
    ? (dados.lixeira.length ? '<button class="link-button" data-esvaziar="">Esvaziar lixeira</button>' : '')
    : f ? `<button class="link-button" data-renomear="${esc(f.id)}">Renomear pasta</button><button class="link-button danger" data-apagar-pasta="${esc(f.id)}">Apagar pasta</button>` : '';
  $('#rodape').textContent = `${dados.meus.length} projeto(s) seu(s) · ${dados.turma.length} referência(s) da turma`;
}

function vazio() {
  if (state.vista === 'removidos') return 'Nada removido. Itens da turma que você remover e projetos excluídos aparecem aqui para restaurar.';
  if (state.busca || Object.values(state.filtro).some(Boolean)) return 'Nada com estes filtros. Limpe a busca ou os filtros.';
  if (state.aba === 'meus') return 'Nenhum projeto guardado ainda. Ao terminar uma edição, o agente guarda o projeto aqui, com capa e uma prévia leve.';
  if (pasta(state.aba)) return 'Pasta vazia. Use o menu ⋯ de qualquer card para adicionar aqui.';
  return 'A biblioteca está vazia.';
}

function renderAbas() {
  const v = visiveis(), conta = n => `<small>${n}</small>`;
  if (state.vista === 'removidos') { $('#abas').innerHTML = `<button class="tab active">Removidos e lixeira${conta(dados.lixeira.length + dados.turma.filter(i => oculto(i.id)).length)}</button>`; return; }
  if (state.aba !== 'tudo' && state.aba !== 'meus' && !pasta(state.aba)) state.aba = 'tudo';
  const abas = [['tudo', 'Tudo', v.length], ['meus', 'Meus projetos', dados.meus.filter(i => !oculto(i.id)).length],
    ...dados.preferencias.pastas.map(f => [f.id, f.nome, v.filter(i => f.itens.includes(i.id)).length])];
  $('#abas').innerHTML = abas.map(([id, nome, n]) => `<button class="tab${state.aba === id ? ' active' : ''}" data-aba="${esc(id)}" aria-pressed="${state.aba === id}">${esc(nome)}${conta(n)}</button>`).join('')
    + '<button class="tab add-tab" data-nova-pasta="" aria-label="Nova pasta">＋ Pasta</button>';
}

function renderFiltros() {
  const painel = $('#filtros');
  if (painel.hidden) return;
  const f = state.filtro, estilos = [...new Set(todos().map(i => i.estilo).filter(Boolean))].sort();
  const formatos = [...new Set(todos().map(i => i.formato).filter(Boolean))].sort();
  const grupo = (titulo, chave, opcoes) => `<div class="filter-block"><h3>${titulo}</h3><div class="filter-options">`
    + [['', 'Todos'], ...opcoes].map(([v, l]) => `<button class="filter-option${f[chave] === v ? ' active' : ''}" data-filtro="${chave}" data-valor="${esc(v)}">${esc(l)}</button>`).join('') + '</div></div>';
  painel.innerHTML = grupo('Tipo', 'categoria', [['edicao', 'Edição falada'], ['motion', 'Motion']]) + grupo('Formato', 'formato', formatos.map(x => [x, x]))
    + grupo('Estilo', 'estilo', estilos.map(x => [x, x]))
    + `<div class="filter-block"><h3>Avaliação</h3><label class="check"><input type="checkbox" id="so-boas"${f.boas ? ' checked' : ''}>Só as que marquei como boas</label></div>`;
}

// ---------- player no próprio card ----------

function parar() {
  if (!player) return;
  const { video, stage, poster } = player; player = null;
  if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
  if (stage.isConnected) stage.replaceWith(poster);
}

function assistir(id) {
  const item = porId(id);
  if (!item?.video && !item?.embed) { toast('Vídeo ainda não disponível.'); return; }
  if (player?.id === id) { player.video?.play().catch(() => {}); return; }
  parar();
  const poster = document.querySelector(`${sel(id)} .poster`);
  if (!poster) return;
  if ($('#detalhes').open) $('#detalhes').close();
  const stage = document.createElement('div');
  stage.className = poster.className + ' inline-player';
  let video = null;
  if (item.video) {
    video = document.createElement('video');
    Object.assign(video, { controls: true, playsInline: true, preload: 'metadata', autoplay: true });
    video.setAttribute('aria-label', 'Reproduzir ' + item.titulo);
    if (item.poster) video.poster = item.poster;
    const falha = document.createElement('div');
    falha.className = 'inline-video-error'; falha.hidden = true;
    falha.innerHTML = `<p role="status">Não foi possível carregar o vídeo.</p><button data-assistir-de-novo="${esc(id)}">Tentar novamente</button>`
      + (item.video_url ? `<a href="${esc(item.video_url)}" target="_blank" rel="noopener noreferrer">Abrir no Drive ↗</a>` : '');
    video.addEventListener('error', () => { if (video.hasAttribute('src')) falha.hidden = false; });
    video.src = item.video;
    stage.append(video, falha);
  } else {
    const frame = document.createElement('iframe');
    Object.assign(frame, { src: item.embed, title: 'Vídeo original no Instagram', loading: 'lazy' });
    frame.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
    stage.append(frame);
  }
  poster.replaceWith(stage);
  player = { id, stage, poster, video };
  if (video) { video.focus({ preventScroll: true }); video.play().catch(() => {}); }
}

// ---------- ações ----------

function pedido(item) {
  if (item.tipo === 'projeto') return item.categoria === 'motion'
    ? `Faz um motion novo usando como base o meu projeto "${item.titulo}" (${item.caminho}): mesmo estilo e acabamento, com a minha marca. O novo motion é sobre: `
    : `Usa o meu projeto "${item.titulo}" (${item.caminho}) como base para editar o meu vídeo novo de entrada/: mesmo estilo, layout e acabamento.`;
  const ref = `"${item.titulo}" da biblioteca (ID ${item.id}${item.link_original ? `, original: ${item.link_original}` : ''})`;
  if (item.categoria === 'motion') return `Faz um motion para a minha marca usando como referência ${ref}. Estude o ritmo, a tipografia, as transições e o áudio dela e comece pelo storyboard. O motion é sobre: `;
  if (item.estilo) return `Edita o meu vídeo de entrada/ no estilo ${item.estilo}, usando como referência ${ref}. Use a minha marca de marca/design.md.`;
  return `Copia o estilo da referência ${ref} e edita o meu vídeo de entrada/ nesse estilo, com a minha marca de marca/design.md.`;
}

async function usar(id) {
  const item = porId(id), texto = pedido(item), completar = texto.endsWith(': ');
  try {
    await navigator.clipboard.writeText(texto);
    toast(completar ? 'Pedido copiado. Cole no Claude Code ou no Codex e complete com o assunto.' : 'Pedido copiado. Cole no Claude Code ou no Codex.');
  } catch {
    detalhes(id);
    const area = $('#pedido-texto'); if (area) { area.focus(); area.select(); }
    toast('Copie o pedido destacado nos detalhes.');
  }
}

function detalhes(id) {
  const item = porId(id); if (!item) return;
  $('#detalhes-titulo').textContent = item.titulo;
  const meta = [['Tipo', TIPO[item.categoria] || '—'], ['Formato', [item.formato, duracao(item.duracao)].filter(Boolean).join(' · ') || '—'],
    ['Estilo', item.estilo ? `${item.estilo} (estilos/${item.estilo}.md)` : 'sem receita: o agente estuda a referência'],
    ['Origem', item.tipo === 'turma' ? (item.autor ? `${item.autor} no Instagram` : 'Biblioteca da turma') : `Seu projeto · ${item.caminho}`]];
  if (item.video_final) meta.push(['Vídeo final', item.video_final]);
  if (item.compactado) meta.push(['Espaço', 'compactado: o agente refaz os arquivos pesados se você quiser mexer']);
  const botoes = [(item.video || item.embed) && item.tipo !== 'lixeira' ? `<button data-assistir="${esc(id)}">Assistir no card</button>` : '',
    item.tipo !== 'lixeira' ? `<button class="primary" data-usar="${esc(id)}">Usar como referência ↗</button>` : '',
    item.link_original ? `<a class="detail-link" href="${esc(item.link_original)}" target="_blank" rel="noopener noreferrer">Abrir no Instagram ↗</a>` : '',
    item.video_url ? `<a class="detail-link" href="${esc(item.video_url)}" target="_blank" rel="noopener noreferrer">Abrir no Drive ↗</a>` : ''].join('');
  $('#detalhes-corpo').innerHTML = `<div class="detail-controls">${botoes}</div>`
    + (item.poster ? `<img class="preview-media" src="${esc(item.poster)}" alt="">` : '')
    + `<div class="detail-meta">${meta.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>`
    + (item.aprender?.length ? `<h3>O que aprender</h3><ul>${item.aprender.map(a => `<li>${esc(a)}</li>`).join('')}</ul>` : '')
    + (item.tipo !== 'lixeira' ? `<h3>Pedido para o agente</h3><textarea id="pedido-texto" readonly rows="4">${esc(pedido(item))}</textarea>` : '')
    + `<p class="small-muted">ID ${esc(item.id)}</p>`;
  if (!$('#detalhes').open) $('#detalhes').showModal();
}

function perguntar({ titulo, texto = '', campo = false, valor = '', opcao = null, confirmar = 'Confirmar', perigo = false }) {
  const caixa = $('#caixa');
  $('#caixa-titulo').textContent = titulo;
  $('#caixa-texto').textContent = texto;
  const input = $('#caixa-campo'); input.hidden = !campo; input.value = valor; input.required = campo;
  $('#caixa-opcao').hidden = !opcao; $('#caixa-marcado').checked = false; $('#caixa-opcao span').textContent = opcao || '';
  $('#caixa-ok').textContent = confirmar; $('#caixa-ok').classList.toggle('danger-button', perigo);
  caixa.returnValue = '';
  caixa.showModal();
  if (campo) input.select();
  return new Promise(resolve => caixa.addEventListener('close', () => resolve({ ok: caixa.returnValue === 'ok', valor: input.value.trim(), marcado: $('#caixa-marcado').checked }), { once: true }));
}

const novoId = () => 'pasta-' + Math.random().toString(36).slice(2, 10);

async function novaPasta(itemId) {
  const r = await perguntar({ titulo: 'Nova pasta', texto: 'Dê um nome curto, como “Ganchos” ou “Anúncios”.', campo: true, confirmar: 'Criar pasta' });
  if (!r.ok || !r.valor) return;
  const id = novoId();
  if (await mudar(p => p.pastas.push({ id, nome: r.valor, itens: itemId ? [itemId] : [] }))) {
    if (!itemId) { state.aba = id; render(); }
    toast(itemId ? `Adicionado à pasta “${r.valor}”.` : `Pasta “${r.valor}” criada. Adicione itens pelo menu ⋯ de cada card.`);
  }
}

async function excluir(id) {
  const item = porId(id);
  const r = await perguntar({ titulo: 'Excluir projeto', texto: `“${item.titulo}” vai para a lixeira. Dá para restaurar depois em “Removidos e lixeira”. O vídeo bruto em entrada/ nunca é apagado.`,
    opcao: item.video_final?.startsWith('saida/') ? `Mover também o vídeo final (${item.video_final}) para a lixeira` : null, confirmar: 'Excluir', perigo: true });
  if (!r.ok) return;
  if (player?.id === id) parar();
  try { await api('/api/projetos/excluir', { nome: item.nome, com_video: r.marcado }); await carregar(); toast('Projeto na lixeira.'); }
  catch (e) { toast(e.message); }
}

async function comLixeira(caminho, corpo, mensagem) {
  try { await api(caminho, corpo); await carregar(); toast(mensagem); } catch (e) { toast(e.message); }
}

function toast(texto) {
  const t = $('#toast'); t.textContent = texto; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 4500);
}

const AJUDA = 'Assistir: clique na capa e o vídeo toca no próprio card.\n'
  + 'Usar como referência: copia um pedido pronto para colar no Claude Code ou no Codex.\n'
  + 'Pastas: crie em “＋ Pasta” e organize pelo menu ⋯ de cada card.\n'
  + 'Meus projetos: ao terminar uma edição, o agente guarda o projeto aqui com capa e prévia leve.\n'
  + 'Remover: itens da turma ficam ocultos; seus projetos vão para a lixeira e podem ser restaurados.\n'
  + 'Também dá para pedir ao agente: “guarda na pasta Anúncios”, “apaga o projeto X”.';

document.addEventListener('click', async event => {
  const alvo = event.target.closest('button, [data-aba]');
  const menuAtual = event.target.closest('details');
  document.querySelectorAll('.library-menu[open], .card-menu[open]').forEach(m => { if (m !== menuAtual) m.open = false; });
  if (!alvo) return;
  const d = alvo.dataset;
  if (menuAtual && (d.detalhes !== undefined || d.ocultar || d.excluir || d.apagar || d.acao || (d.novaPasta !== undefined))) menuAtual.open = false;
  if (d.assistir) assistir(d.assistir);
  else if (d.assistirDeNovo) { parar(); assistir(d.assistirDeNovo); }
  else if (d.detalhes) detalhes(d.detalhes);
  else if (d.usar) usar(d.usar);
  else if (d.fechar) $('#' + d.fechar).close();
  else if (d.aba) { state.aba = d.aba; state.limite = 48; render(); }
  else if (d.avaliar) await mudar(p => { if (p.avaliacoes[d.avaliar] === d.valor) delete p.avaliacoes[d.avaliar]; else p.avaliacoes[d.avaliar] = d.valor; });
  else if (d.pasta) await mudar(p => { const f = p.pastas.find(x => x.id === d.pasta); if (f) f.itens = f.itens.includes(d.item) ? f.itens.filter(x => x !== d.item) : [...f.itens, d.item]; });
  else if (d.novaPasta !== undefined) novaPasta(d.novaPasta || null);
  else if (d.ocultar) { if (player?.id === d.ocultar) parar(); if (await mudar(p => { p.ocultos.push(d.ocultar); })) toast('Removido da sua biblioteca. Para trazer de volta: “Removidos e lixeira”.'); }
  else if (d.mostrar) await mudar(p => { p.ocultos = p.ocultos.filter(x => x !== d.mostrar); });
  else if (d.excluir) excluir(d.excluir);
  else if (d.restaurar) comLixeira('/api/projetos/restaurar', { item: d.restaurar }, 'Projeto restaurado em Meus projetos.');
  else if (d.apagar) { if ((await perguntar({ titulo: 'Apagar de vez', texto: 'Este projeto some da lixeira e do computador. Não dá para desfazer.', confirmar: 'Apagar de vez', perigo: true })).ok) comLixeira('/api/lixeira/esvaziar', { item: d.apagar }, 'Apagado de vez.'); }
  else if (d.esvaziar !== undefined) { if ((await perguntar({ titulo: 'Esvaziar lixeira', texto: 'Todos os projetos da lixeira serão apagados de vez. Não dá para desfazer.', confirmar: 'Esvaziar', perigo: true })).ok) comLixeira('/api/lixeira/esvaziar', {}, 'Lixeira vazia.'); }
  else if (d.renomear) { const f = pasta(d.renomear); const r = await perguntar({ titulo: 'Renomear pasta', campo: true, valor: f.nome, confirmar: 'Salvar' }); if (r.ok && r.valor) await mudar(p => { p.pastas.find(x => x.id === d.renomear).nome = r.valor; }); }
  else if (d.apagarPasta) { const f = pasta(d.apagarPasta); if ((await perguntar({ titulo: 'Apagar pasta', texto: `A pasta “${f.nome}” some, mas os itens continuam na biblioteca.`, confirmar: 'Apagar pasta', perigo: true })).ok && await mudar(p => { p.pastas = p.pastas.filter(x => x.id !== d.apagarPasta); })) { state.aba = 'tudo'; render(); } }
  else if (d.filtro) { state.filtro[d.filtro] = d.valor; state.limite = 48; render(); }
  else if (d.acao === 'ajuda') perguntar({ titulo: 'Como usar a biblioteca', texto: AJUDA, confirmar: 'Entendi' }).then(() => {});
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.library-menu[open], .card-menu[open]').forEach(m => { m.open = false; m.querySelector('summary').focus(); }); });
document.addEventListener('change', e => { if (e.target.id === 'so-boas') { state.filtro.boas = e.target.checked; render(); } });
$('#busca').addEventListener('input', e => { state.busca = e.target.value; state.limite = 48; render(); });
$('#ordem').addEventListener('change', e => { state.ordem = e.target.value; render(); });
$('#vista').addEventListener('change', e => { state.vista = e.target.value; state.limite = 48; render(); });
$('#mais').addEventListener('click', () => { state.limite += 48; render(); });
$('#filtros-botao').addEventListener('click', () => { const p = $('#filtros'); p.hidden = !p.hidden; $('#filtros-botao').setAttribute('aria-expanded', String(!p.hidden)); render(); });
$('#detalhes').addEventListener('click', e => { if (e.target === $('#detalhes')) $('#detalhes').close(); });

// O agente pode guardar ou organizar enquanto o feed está aberto: confere a cada 8 s.
setInterval(async () => {
  if (document.hidden || $('#caixa').open) return;
  try { const { estado } = await (await fetch('/api/estado', { cache: 'no-store' })).json(); if (estado !== dados.estado) await carregar(); } catch { /* servidor fechado */ }
}, 8000);

carregar().then(migrarDoNavegador).catch(e => { $('#grade').innerHTML = `<div class="empty">${esc(e.message)} Confira se o comando da biblioteca está rodando.</div>`; });
