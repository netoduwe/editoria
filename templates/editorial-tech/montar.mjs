#!/usr/bin/env node
// Template editorial-tech: monta a composição HyperFrames de um vídeo falado a partir de cenas.json.
// Uso: node templates/editorial-tech/montar.mjs projetos/<nome> [--sem-cabeca]
//   --sem-cabeca  monta sem a camada da pessoa recortada: use só para o `npx hyperframes check`,
//                 que trava com vídeo webm transparente (HyperFrames 0.8.15x). Depois monte de novo sem a opção.
//
// O agente escreve projetos/<nome>/cenas.json (layout por trecho da fala + textos) e este script gera
// projetos/<nome>/composicao/index.html com a marca de marca/design.md: legendas sincronizadas às palavras,
// cabeça sobre o painel, telas com títulos, calendário, botão, chat, grade, oferta e encerramento com logo.
// Efeitos sonoros são sintetizados aqui (sem arquivos de terceiros). Nada é escrito fora do projeto.
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, statSync } from 'node:fs';
import { join, resolve, dirname, basename, relative } from 'node:path';
import { homedir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const KIT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const projeto = resolve(process.argv[2] || '');
if (!process.argv[2] || !existsSync(join(projeto, 'cenas.json'))) {
  console.error('Uso: node templates/editorial-tech/montar.mjs projetos/<nome>   (precisa de projetos/<nome>/cenas.json)');
  process.exit(1);
}
const C = JSON.parse(readFileSync(join(projeto, 'cenas.json'), 'utf8'));
const comp = join(projeto, 'composicao'), assets = join(comp, 'assets');
mkdirSync(join(assets, 'fonts'), { recursive: true });
mkdirSync(join(assets, 'sfx'), { recursive: true });

// ---------- marca ----------
const marcaTxt = readFileSync(join(KIT, 'marca/design.md'), 'utf8');
const hex = papel => new RegExp(`\\|\\s*${papel}\\s*\\|\\s*\`?(#[0-9A-Fa-f]{6})`).exec(marcaTxt)?.[1];
const M = {
  escuro: hex('Fundo escuro') || '#0B1426', claro: hex('Fundo claro') || '#EEF3F9',
  destaque: hex('Destaque') || '#12B5FF', destaque2: hex('Destaque 2') || hex('Destaque') || '#1F5BFF',
  alerta: C.cores?.alerta || '#E5483C',
};
const logoArq = /marca\/logo\/([^`\s)]+)/.exec(marcaTxt)?.[1];
const logo = logoArq && existsSync(join(KIT, 'marca/logo', logoArq)) ? join(KIT, 'marca/logo', logoArq) : null;
const logoSrc = logo ? 'assets/logo' + logo.slice(logo.lastIndexOf('.')).toLowerCase() : null;
if (logo) { copyFileSync(logo, join(comp, logoSrc)); copyFileSync(logo, join(comp, logoSrc.replace('logo.', 'logo-mini.'))); }
for (const f of ['inter-600', 'inter-800', 'inter-900', 'instrument-serif-italic']) copyFileSync(join(KIT, 'fontes', f + '.woff2'), join(assets, 'fonts', f + '.woff2'));

// ---------- mídia ----------
const ff = args => { const r = spawnSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', ...args], { encoding: 'utf8' }); if (r.status) throw new Error(r.stderr); };
const dur = arq => Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', arq], { encoding: 'utf8' }).stdout);
const video = resolve(projeto, C.video || 'corte.mp4');
if (!existsSync(join(assets, 'corte.mp4'))) copyFileSync(video, join(assets, 'corte.mp4'));
// O painel do split usa uma cópia própria: o mesmo arquivo em dois vídeos idênticos confunde a extração de quadros.
if (!existsSync(join(assets, 'corte-painel.mp4'))) copyFileSync(join(assets, 'corte.mp4'), join(assets, 'corte-painel.mp4'));
if (!existsSync(join(assets, 'voz.wav'))) ff(['-i', video, '-vn', '-ac', '1', '-ar', '48000', '-c:a', 'pcm_s16le', join(assets, 'voz.wav')]);
const D = Number(dur(join(assets, 'corte.mp4')).toFixed(3));
const temPessoa = existsSync(join(assets, 'pessoa.webm')) && !process.argv.includes('--sem-cabeca');
// Efeitos graves e curtos, sintetizados: pop (entrada), toque (botão), passagem (troca), sino (encerramento).
const SFX = {
  pop: "aevalsrc='0.55*sin(2*PI*(170+260*exp(-t*26))*t)*exp(-t*22)':d=0.22:s=48000,lowpass=f=1800",
  toque: "aevalsrc='0.6*sin(2*PI*(120+90*exp(-t*40))*t)*exp(-t*35)':d=0.14:s=48000,lowpass=f=1200",
  passagem: 'anoisesrc=d=0.42:c=pink:seed=7:a=0.5,highpass=f=220,lowpass=f=2400,afade=t=in:d=0.28,afade=t=out:st=0.28:d=0.14',
  sino: "aevalsrc='0.32*sin(2*PI*294*t)*exp(-t*3.2)+0.2*sin(2*PI*441*t)*exp(-t*4.2)+0.1*sin(2*PI*588*t)*exp(-t*6)':d=1.6:s=48000,lowpass=f=2200",
};
const sfxDur = {};
for (const [nome, filtro] of Object.entries(SFX)) {
  const arq = join(assets, 'sfx', nome + '.wav');
  if (!existsSync(arq)) ff(['-f', 'lavfi', '-i', filtro, '-ac', '1', '-ar', '48000', arq]);
  sfxDur[nome] = Number(dur(arq).toFixed(3));
}

// ---------- palavras ----------
const palavras = JSON.parse(readFileSync(resolve(projeto, C.transcricao || 'corte-transcricao/transcript.json'), 'utf8'))
  .map(w => ({ t: Number(w.start), f: Number(w.end), txt: String(w.text).trim() }));
for (const [de, para] of Object.entries(C.corrigir || {})) {
  const a = de.split(/\s+/), b = para.split(/\s+/);
  for (let i = 0; i + a.length <= palavras.length; i++) {
    if (a.every((x, k) => norm(palavras[i + k].txt) === norm(x))) b.forEach((x, k) => { if (palavras[i + k]) palavras[i + k].txt = x; });
  }
}
// Transcrição corrigida para o SRT (o mesmo texto da legenda na tela).
if (C.corrigir && Object.keys(C.corrigir).length) {
  const base = resolve(projeto, C.transcricao || 'corte-transcricao/transcript.json');
  writeFileSync(base.replace(/.json$/, '.corrigido.json'), JSON.stringify(palavras.map((p, i) => ({ id: 'w' + i, text: p.txt, start: p.t, end: p.f })), null, 1));
}
function norm(s) { return String(s).toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9/]/g, ''); }
// Tempo da palavra dentro da cena (primeira ocorrência); número = segundos absolutos.
function emBruto(ref, cena, padrao) {
  if (typeof ref === 'number') return ref;
  if (!ref) return padrao ?? cena.inicio + 0.1;
  const alvo = norm(ref.split(/\s+/)[0]);
  const w = palavras.find(p => p.t >= cena.inicio - 0.25 && p.t < cena.fim && norm(p.txt).startsWith(alvo));
  if (!w) { console.warn(`⚠ palavra "${ref}" não encontrada na cena ${cena.inicio}–${cena.fim}; usei o início.`); return cena.inicio + 0.1; }
  return w.t;
}
// Tela nunca começa vazia: o que entraria nos primeiros 0,35 s (e o primeiro elemento da tela, se tudo vier
// depois) começa 0,06 s antes do corte, para já estar entrando quando a cena aparece.
function em(ref, cena, padrao) {
  const t = emBruto(ref, cena, padrao);
  if (cena.tipo === 'tela' && (t - cena.inicio < 0.35 || Math.abs(t - (cena._primeira ?? -1)) < 0.001)) return cena.inicio - 0.06;
  return t;
}
function primeiraEntrada(cena) {
  const tempos = [];
  (function varrer(o) {
    if (Array.isArray(o)) { o.forEach(varrer); return; }
    if (!o || typeof o !== 'object') return;
    for (const [k, v] of Object.entries(o)) { if ((k === 'em' || k.endsWith('_em')) && v != null && typeof v !== 'object') tempos.push(emBruto(v, cena)); else varrer(v); }
  })(cena.visual);
  return tempos.length ? Math.min(...tempos) : null;
}

// ---------- montagem ----------
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const n3 = x => Number(x).toFixed(3);
const html = [], tl = [], audios = [], css = [];
let uid = 0, faixaSfx = 0;
const id = p => `${p}${++uid}`;
// Com trilha, a música já marca as trocas: sai o efeito de passagem e os outros ficam mais baixos.
const som = (nome, t, vol = 0.3) => { if (!nome || t >= DT || (musica && nome === 'passagem')) return; if (musica) vol = Number((vol * 0.7).toFixed(2)); audios.push(`<audio id="${id('sfx')}" src="assets/sfx/${nome}.wav" data-start="${n3(t)}" data-duration="${n3(Math.min(sfxDur[nome], DT - t))}" data-track-index="${4 + (faixaSfx++ % 4)}" data-volume="${vol}"></audio>`); };
const cenas = C.cenas.map(c => ({ ...c }));
const DT = Number((Math.max(D, ...cenas.map(c => c.fim))).toFixed(3));

// ---------- trilha (opcional): batidas para encaixar o movimento ----------
// "musica": { "arquivo": "...mp3", "inicio": null, "volume": 0.7, "carve": 0.8 }
// inicio = segundos na música em que o vídeo começa; sem ele, o template escolhe, perto do começo da música,
// o ponto que faz mais trocas de cena caírem na batida (as trocas não mudam: elas escondem as emendas do corte).
let musica = null;
if (C.musica) {
  const origem = resolve(projeto, C.musica.arquivo || '');
  if (!existsSync(origem)) throw new Error(`Trilha não encontrada: ${C.musica.arquivo}`);
  const nomeTrilha = 'music-bed' + origem.slice(origem.lastIndexOf('.')).toLowerCase(), destino = join(assets, nomeTrilha);
  if (!existsSync(destino) || statSync(destino).size !== statSync(origem).size) copyFileSync(origem, destino);
  const arqBatidas = join(comp, 'beats', 'assets', nomeTrilha + '.json');
  if (!existsSync(arqBatidas)) {
    // O detector do HyperFrames lê a trilha da composição: monta uma composição mínima só com ela.
    const d = Math.floor(dur(destino));
    writeFileSync(join(comp, 'index.html'), `<!doctype html><html><head><meta charset="UTF-8"><script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script></head><body><div id="root" data-composition-id="main" data-start="0" data-duration="${d}" data-width="1080" data-height="1920"><audio id="music" src="assets/${nomeTrilha}" data-start="0" data-duration="${d}" data-track-index="0"></audio></div><script>window.__timelines["main"]=gsap.timeline({paused:true});</script></body></html>`);
    const r = spawnSync('npx --yes hyperframes beats', { cwd: comp, shell: true, encoding: 'utf8' });
    if (!existsSync(arqBatidas)) throw new Error('Não consegui detectar as batidas da trilha: ' + String(r.stderr || r.stdout).slice(-300));
  }
  const todas = JSON.parse(readFileSync(arqBatidas, 'utf8')).beats.map(b => ({ t: b.time, f: b.strength }));
  const difs = todas.slice(1).map((b, i) => b.t - todas[i].t).sort((a, b) => a - b), periodo = difs[Math.floor(difs.length / 2)] || 0.6;
  // Trocas que escondem uma emenda do corte ficam onde estão; as que caem no meio de uma fala contínua podem andar.
  const mapa = (() => { try { return JSON.parse(readFileSync(resolve(projeto, (C.video || 'corte.mp4').replace(/\.[^.]+$/, '') + '.mapa.json'), 'utf8')); } catch { return null; } })();
  const emendas = (mapa?.segmentos || []).map(s => s.timeline_inicio).filter(t => t > 0);
  const naEmenda = x => !mapa || emendas.some(j => Math.abs(j - x) < 0.12) || x >= D - 0.05;
  const acerta = (rel, x) => rel.some(t => Math.abs(t - x) <= 0.07);
  let inicio = C.musica.inicio;
  if (inicio == null) {
    const fixas = cenas.slice(1).map(c => c.inicio).filter(naEmenda);
    const base = (todas.find(b => b.f >= 0.75) || todas[0]).t;
    let melhor = { o: base, n: -1, d: 0 };
    for (let o = Math.max(0, base - periodo); o <= base + periodo + 1e-9; o += 0.01) {
      const rel = todas.map(b => b.t - o).filter(t => t > -0.1 && t < DT + 0.1);
      const n = fixas.filter(x => acerta(rel, x)).length, d = Math.abs(o - base);
      if (n > melhor.n || (n === melhor.n && d < melhor.d)) melhor = { o, n, d };
    }
    inicio = Number(melhor.o.toFixed(3));
  }
  const batidas = todas.map(b => ({ t: Number((b.t - inicio).toFixed(3)), f: b.f })).filter(b => b.t >= 0 && b.t < DT - 0.05);
  const ajustadas = [];
  if (C.musica.encaixar !== false) for (let i = 1; i < cenas.length; i++) {
    const x = cenas[i].inicio;
    if (naEmenda(x)) continue;
    const b = batidas.reduce((m, y) => (Math.abs(y.t - x) < Math.abs(m.t - x) ? y : m), batidas[0]);
    if (b && Math.abs(b.t - x) <= 0.22 && b.t - cenas[i - 1].inicio >= 0.6 && cenas[i].fim - b.t >= 0.6) { cenas[i - 1].fim = cenas[i].inicio = b.t; ajustadas.push(`${x.toFixed(2)}→${b.t.toFixed(2)}`); }
  }
  musica = { src: 'assets/' + nomeTrilha, inicio, periodo, batidas, ajustadas, volume: C.musica.volume ?? 0.7, carve: C.musica.carve ?? 0.8,
    acertos: cenas.slice(1).map(c => c.inicio).filter(x => acerta(batidas.map(b => b.t), x)) };
}
const mostra =(sel, a, b) => { tl.push(`tl.set("${sel}",{opacity:1},${n3(a)});`); if (b < DT - 0.001) tl.push(`tl.set("${sel}",{opacity:0},${n3(b)});`); };
const entra = (sel, t, extra = {}) => {
  const { y = 28, d = 0.45, ease = 'expo.out', scale } = extra;
  tl.push(`tl.fromTo("${sel}",{opacity:0,y:${y}${scale ? ',scale:' + scale : ''}},{opacity:1,y:0${scale ? ',scale:1' : ''},duration:${d},ease:"${ease}"},${n3(t)});`);
};
// Texto que monta palavra por palavra: cada parte entra por máscara na palavra falada.
function linhaFalada(linhas, cena, classe = '') {
  return linhas.map(l => {
    const partes = (Array.isArray(l.partes) ? l.partes : [{ texto: l.texto, em: l.em }]);
    return `<div class="linha ${l.estilo || 'serif'} ${classe} cor-${l.cor || 'texto'}" style="${l.tamanho ? `font-size:${l.tamanho}px` : ''}">` + partes.map(p => {
      const i = id('w'); const t = em(p.em, cena);
      tl.push(`tl.fromTo("#${i}",{yPercent:110,opacity:0},{yPercent:0,opacity:1,duration:.5,ease:"expo.out"},${n3(t)});`);
      return `<span class="mask" data-layout-allow-overflow data-layout-allow-occlusion><span class="w" data-layout-allow-occlusion id="${i}">${esc(p.texto)}</span></span>`;
    }).join(' ') + '</div>';
  }).join('');
}

const icones = {
  check: '<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="ic-c"/><path d="M36 62l16 16 32-36" class="ic-l" pathLength="420"/></svg>',
  x: '<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="ic-c"/><path d="M42 42l36 36M78 42L42 78" class="ic-l" pathLength="420"/></svg>',
  infinito: '<svg viewBox="0 0 240 120"><path d="M120 60c-22-30-46-42-68-42-24 0-42 18-42 42s18 42 42 42c22 0 46-12 68-42s46-42 68-42c24 0 42 18 42 42s-18 42-42 42c-22 0-46-12-68-42z" class="ic-l inf" pathLength="420"/></svg>',
};
function icone(nome, t, extra = '') {
  if (!icones[nome]) return '';
  const i = id('ic');
  tl.push(`tl.fromTo("#${i}",{opacity:0,scale:.6},{opacity:1,scale:1,duration:.5,ease:"back.out(2)"},${n3(t)});`);
  // Traço surge junto com o desenho: com ponta redonda, um traço de tamanho zero aparece como um ponto parado.
  tl.push(`tl.fromTo("#${i} .ic-l",{strokeDashoffset:420,opacity:0},{strokeDashoffset:0,opacity:1,duration:.6,ease:"power3.out"},${n3(t + 0.05)});`);
  return `<div class="icone ${nome} ${extra}" id="${i}">${icones[nome]}</div>`;
}

// Componentes visuais (usados em tela cheia ou na metade de cima do split)
function componente(k, cena) {
  const t0 = cena.inicio;
  switch (k.tipo) {
    case 'titulo': {
      const ti = em(k.icone_em, cena, t0 + 0.15);
      const rot = k.rotulo ? (() => { const i = id('r'); entra(`#${i}`, em(k.rotulo_em, cena, t0 + 0.05), { y: 14 }); return `<div class="rotulo" id="${i}">${esc(k.rotulo)}</div>`; })() : '';
      som(k.som ?? 'pop', ti, 0.28);
      return `<div class="k-titulo">${k.icone ? icone(k.icone, ti) : ''}${rot}${linhaFalada(k.linhas, cena)}</div>`;
    }
    case 'calendario': {
      // O card já está na tela desde o início; a data carimba na palavra.
      const tc = em(k.em, cena), i = id('cal'), dt = id('cd'), tr = k.rotulo ? em(k.rotulo_em, cena, t0 + 0.1) : t0;
      tl.push(`tl.fromTo("#${i}",{opacity:0,rotationX:-75,y:40},{opacity:1,rotationX:0,y:0,duration:.8,ease:"back.out(1.4)",transformPerspective:900},${n3(Math.min(tc, t0 - 0.06))});`);
      tl.push(`tl.fromTo("#${dt}",{opacity:0,scale:1.7},{opacity:1,scale:1,duration:.4,ease:"expo.out"},${n3(tc)});`);
      som('pop', tc, 0.3);
      let extra = '';
      if (k.extra) { const j = id('cx'), te = em(k.extra.em, cena); tl.push(`tl.fromTo("#${j}",{opacity:0,scale:1.8},{opacity:1,scale:1,duration:.45,ease:"expo.out"},${n3(te)});`); som('toque', te, 0.35); extra = `<div class="cal-extra" id="${j}">${esc(k.extra.texto)}</div>`; }
      const r = id('r'); entra(`#${r}`, tr, { y: 16 });
      return `<div class="k-cal"><div class="rotulo" id="${r}">${esc(k.rotulo || '')}</div>${k.sub ? linhaFalada([{ partes: [{ texto: k.sub.texto, em: k.sub.em }], estilo: 'serif', tamanho: 92 }], cena) : ''}<div class="cal" id="${i}"><div class="cal-topo"><i></i><i></i></div><div class="cal-data" id="${dt}">${esc(k.data)}</div>${extra}</div></div>`;
    }
    case 'botao': {
      const tb = em(k.em, cena), b = id('bt'), dedo = id('dd'), onda = id('on'), seta = id('st');
      entra(`#${b}`, t0 + 0.08, { y: 40, scale: 0.92, d: Math.max(0.2, Math.min(0.45, tb - t0 - 0.12)) });
      tl.push(`tl.fromTo("#${dedo}",{opacity:0,x:180,y:220},{opacity:1,x:0,y:0,duration:.55,ease:"expo.out"},${n3(Math.max(t0 + 0.2, tb - 0.55))});`);
      tl.push(`tl.to("#${b}",{scale:.94,duration:.08,ease:"power2.in"},${n3(tb)});tl.to("#${b}",{scale:1,duration:.35,ease:"back.out(2.4)"},${n3(tb + 0.08)});`);
      tl.push(`tl.fromTo("#${onda}",{opacity:.55,scale:.3},{opacity:0,scale:2.6,duration:.7,ease:"expo.out"},${n3(tb)});`);
      som('toque', tb, 0.45);
      if (k.seta_em) tl.push(`tl.fromTo("#${seta}",{opacity:0,y:-30},{opacity:1,y:0,duration:.4,ease:"expo.out"},${n3(em(k.seta_em, cena))});`);
      return `<div class="k-botao">${k.rotulo ? linhaFalada([{ partes: [{ texto: k.rotulo, em: k.rotulo_em }], estilo: 'sans', tamanho: 64 }], cena) : ''}<div class="botao-wrap"><div class="botao" id="${b}"><span>${esc(k.texto)}</span><b>→</b><div class="onda" data-layout-allow-overflow id="${onda}"></div></div><svg class="dedo" data-layout-allow-overflow id="${dedo}" viewBox="0 0 100 130"><path d="M38 8c6 0 10 4 10 10v42l6-2c6-2 12 2 13 8l3 2c6-2 12 2 13 8 6-1 11 4 11 10v18c0 14-10 24-26 24H50c-10 0-17-5-22-13L10 86c-4-6-2-12 4-14 5-2 10 0 13 4l1 2V18c0-6 4-10 10-10z"/></svg></div>${k.seta_em ? `<div class="seta" id="${seta}">↓</div>` : ''}</div>`;
    }
    case 'chat': {
      const th = em(k.em, cena), c = id('ch');
      entra(`#${c}`, th, { y: 60, d: .55 });
      som('pop', th, 0.28);
      const msgs = (k.mensagens || []).map(m => { const j = id('mg'), tm = em(m.em, cena); tl.push(`tl.fromTo("#${j}",{opacity:0,y:24,scale:.96},{opacity:1,y:0,scale:1,duration:.45,ease:"back.out(1.8)"},${n3(tm)});`); som('pop', tm, 0.22); return `<div class="msg" id="${j}">${esc(m.texto)}</div>`; }).join('');
      let antes = '';
      if (k.antes) { const a = id('an'), ta = em(k.antes.em, cena); entra(`#${a}`, ta, { y: 20 }); tl.push(`tl.to("#${a}",{opacity:0,y:-20,duration:.3,ease:"power3.in"},${n3(th - 0.25)});`); antes = `<div class="chat-antes" id="${a}">${esc(k.antes.texto)} <b>→</b></div>`; }
      return `<div class="k-chat">${antes}<div class="chat" id="${c}"><div class="chat-topo"><div class="avatar">${logoSrc ? `<img data-layout-allow-overflow src="${logoSrc.replace('logo.', 'logo-mini.')}" alt="">` : ''}</div><div><b>${esc(k.nome)}</b><small>${esc(k.sub || '')}</small></div></div><div class="chat-corpo">${msgs}</div></div></div>`;
    }
    case 'grade': {
      const tg = Math.min(em(k.em, cena), t0 + 0.1), n = k.quantidade || 12, cards = [];   // a grade monta logo no início
      for (let i = 0; i < n; i++) { const j = id('gc'); cards.push(`<div class="gc" id="${j}"><i></i><span></span><span class="c"></span></div>`); tl.push(`tl.fromTo("#${j}",{opacity:0,y:40,scale:.85},{opacity:1,y:0,scale:1,duration:.4,ease:"back.out(1.6)"},${n3(tg + i * 0.04)});`); }
      som('passagem', tg - 0.05, 0.22);
      const r = k.rotulo ? (() => { const i = id('r'); entra(`#${i}`, em(k.rotulo_em, cena, t0 + 0.05), { y: 14 }); return `<div class="rotulo" id="${i}">${esc(k.rotulo)}</div>`; })() : '';
      return `<div class="k-grade">${r}<div class="grade">${cards.join('')}</div>${linhaFalada(k.linhas || [], cena)}</div>`;
    }
    case 'oferta': {
      return `<div class="k-oferta">${k.itens.map(it => { const j = id('of'), t = em(it.em, cena); tl.push(`tl.fromTo("#${j}",{opacity:0,y:50,rotationY:-35},{opacity:1,y:0,rotationY:0,duration:.6,ease:"expo.out",transformPerspective:900},${n3(t)});`); tl.push(`tl.fromTo("#${j} .brilho",{xPercent:-120},{xPercent:220,duration:.9,ease:"power2.inOut"},${n3(t + 0.35)});`); som('pop', t, 0.28); return `<div class="of" id="${j}"><div class="of-simb">${it.simbolo === 'infinito' ? icones.infinito : esc(it.simbolo)}</div><div class="of-tit">${esc(it.titulo)}</div><div class="of-sub">${esc(it.sub || '')}</div><div class="brilho" data-layout-allow-overflow></div></div>`; }).join('')}</div>`;
    }
    default: throw new Error('Componente desconhecido: ' + k.tipo);
  }
}

// Câmera: um vídeo contínuo em tela cheia (push lento por plano de rosto) + painel com cabeça para o split.
html.push(`<div class="camada" id="cam-wrap"><video id="cam" class="clip" src="assets/corte.mp4" muted playsinline data-start="0" data-duration="${D}" data-track-index="0"></video></div>`);
// Split calibrado por vídeo: a linha do painel deve passar no queixo e o topo do cabelo ficar logo abaixo do visual.
const PT = C.split?.painel_topo ?? 1240;     // y do topo do painel
const OFF = C.split?.deslocamento ?? 690;   // px que a câmera desce no split
const VIS = C.split?.visual_altura ?? 500;   // altura da área do visual (a partir de y 470); deixe ~30 px acima do cabelo
html.push(`<div class="camada split" id="split" style="opacity:0"><div class="split-fundo"></div><div class="split-visual" id="split-visual" style="height:${VIS}px"></div>`
  + `<div class="painel" style="top:${PT}px;height:${1920 - PT}px"><video id="cam-painel" data-layout-allow-overflow class="clip" src="assets/corte-painel.mp4" muted playsinline data-start="0" data-duration="${D}" data-track-index="1" style="top:${OFF - PT}px"></video></div>`
  + (temPessoa ? `<div class="cabeca" style="height:${PT + 70}px"><video id="pessoa" data-layout-allow-overflow class="clip" src="assets/pessoa.webm" muted playsinline data-start="0" data-duration="${D}" data-track-index="2" style="top:${OFF}px"></video></div>` : '')
  + `</div>`);

const visuaisSplit = [], telas = [];
let pushIdx = 0;
for (const cena of cenas) {
  const { tipo } = cena;
  if (tipo === 'tela') cena._primeira = primeiraEntrada(cena);
  if (tipo === 'rosto') {
    const z0 = pushIdx++ % 2 ? 1.08 : 1.0;
    tl.push(`tl.set("#cam-wrap",{scale:${z0}},${n3(cena.inicio)});tl.to("#cam-wrap",{scale:${(z0 + 0.04).toFixed(2)},duration:${n3(cena.fim - cena.inicio)},ease:"none"},${n3(cena.inicio)});`);
    if (cena.selo) { const s = id('selo'); html.push(`<div class="selo" id="${s}" style="opacity:0"><span>${esc(cena.selo)}</span></div>`); mostra(`#${s}`, cena.inicio, cena.fim); entra(`#${s} span`, cena.inicio); }
  } else if (tipo === 'split') {
    mostra('#split', cena.inicio, cena.fim);
    const v = id('sv'); visuaisSplit.push(`<div class="sv" id="${v}" style="opacity:0">${componente(cena.visual, cena)}</div>`); mostra(`#${v}`, cena.inicio, cena.fim);
  } else if (tipo === 'tela' || tipo === 'encerramento') {
    const s = id('tela'), fundo = cena.fundo || (tipo === 'encerramento' ? 'escuro' : 'claro');
    let corpo;
    if (tipo === 'encerramento') {
      const tl0 = cena.inicio + 0.05, l = id('lg'), b = id('bt');
      tl.push(`tl.fromTo("#${l}",{opacity:0,scale:.82,filter:"blur(14px)"},{opacity:1,scale:1,filter:"blur(0px)",duration:.8,ease:"expo.out"},${n3(tl0)});`);
      entra(`#${b}`, tl0 + 0.45, { y: 30 });
      som('sino', tl0, 0.35);
      corpo = `<div class="k-fim">${logoSrc ? `<img class="logo" id="${l}" src="${logoSrc}" alt="">` : `<div id="${l}"></div>`}<div class="botao fim" id="${b}"><span>${esc(cena.cta || 'Saiba mais')}</span><b>→</b></div></div>`;
    } else corpo = componente(cena.visual, cena);
    html.push(`<div class="camada tela fundo-${fundo}" id="${s}" style="opacity:0"><div class="brilho-fundo" data-layout-allow-overflow></div><div class="tela-conteudo">${corpo}</div></div>`);
    mostra(`#${s}`, cena.inicio, cena.fim);
    telas.push({ s, inicio: cena.inicio, fim: cena.fim });
    if (cena.fade) tl.push(`tl.fromTo("#${s} .tela-conteudo",{opacity:0},{opacity:1,duration:.3,ease:"power2.out"},${n3(cena.inicio)});`);
    if (cena.som !== false && tipo !== 'encerramento') som('passagem', cena.inicio - 0.12, 0.16);
  } else throw new Error('Tipo de cena desconhecido: ' + tipo);
}
const splitIdx = html.findIndex(h => h.includes('id="split"'));
html[splitIdx] = html[splitIdx].replace(`<div class="split-visual" id="split-visual" style="height:${VIS}px"></div>`, `<div class="split-visual" id="split-visual" style="height:${VIS}px">${visuaisSplit.join('')}</div>`);
if (!html[splitIdx].includes('class="sv"') && visuaisSplit.length) throw new Error('falha ao inserir os visuais do split');

// Movimento no ritmo da trilha: a imagem (não a legenda, que precisa ficar legível) pulsa leve nas batidas fortes;
// as trocas de cena que caem na batida ganham um punch com flash curto; o brilho das telas respira em cada batida.
if (musica) {
  const acentos = new Map();
  for (const b of musica.batidas) if (b.f >= 0.75) acentos.set(b.t, 1.012);
  for (const x of musica.acertos) { for (const t of [...acentos.keys()]) if (Math.abs(t - x) < 0.1) acentos.delete(t); acentos.set(x, 1.035); }
  tl.push('tl.set("#palco",{scale:1},0);tl.set("#flash",{opacity:0},0);');
  for (const [t, e] of [...acentos].sort((a, b) => a[0] - b[0])) tl.push(`tl.fromTo("#palco",{scale:${e}},{scale:1,duration:${e > 1.02 ? 0.38 : 0.3},ease:"power2.out",immediateRender:false},${n3(t)});`);
  for (const x of musica.acertos) tl.push(`tl.fromTo("#flash",{opacity:.12},{opacity:0,duration:.22,ease:"power2.out",immediateRender:false},${n3(x)});`);
  for (const tela of telas) tl.push(`tl.set("#${tela.s} .brilho-fundo",{scale:1},0);`);
  for (const tela of telas) for (const b of musica.batidas.filter(b => b.t >= tela.inicio && b.t < tela.fim - 0.1))
    tl.push(`tl.fromTo("#${tela.s} .brilho-fundo",{scale:1.08},{scale:1,immediateRender:false,duration:${n3(Math.min(0.5, musica.periodo * 0.8))},ease:"power2.out"},${n3(b.t)});`);
}

// Legenda: 1–2 palavras por vez, trocando no início de cada palavra; só nas cenas com legenda.
const FUNC = new Set(['a', 'o', 'as', 'os', 'de', 'do', 'da', 'dos', 'das', 'e', 'que', 'pra', 'para', 'no', 'na', 'nos', 'nas', 'em', 'um', 'uma', 'se', 'com', 'por', 'eu', 'é', 'vai', 'te', 'me', 'ao', 'à', 'às']);
const destaque = new Set((C.legenda?.destaques || []).flatMap(d => d.split(/\s+/)).map(norm));
const max = C.legenda?.palavras_por_vez || 2;
const legHtml = [];
for (const cena of cenas.filter(c => c.legenda)) {
  const ws = palavras.filter(w => w.t >= (cena.legenda_desde != null ? em(cena.legenda_desde, cena) : cena.inicio) - 0.02 && w.t < cena.fim - 0.15);   // nada de legenda piscando nos últimos quadros da cena
  const grupos = []; let g = [];
  ws.forEach((w, i) => {
    g.push(w);
    const prox = ws[i + 1], fimFrase = /[.,!?;:]$/.test(w.txt), func = FUNC.has(norm(w.txt)) && prox && !fimFrase;
    if (!prox || fimFrase || (!func && g.length >= max) || g.length >= 3 || (prox && prox.t - w.f > 0.25)) { grupos.push(g); g = []; }
  });
  const y = cena.legenda_y || (cena.tipo === 'split' ? 900 : 1300);
  grupos.forEach((gr, i) => {
    const j = id('lg'), a = Math.max(gr[0].t, cena.inicio), b = Math.min(i + 1 < grupos.length ? grupos[i + 1][0].t : gr.at(-1).f + 0.35, cena.fim);
    const txt = gr.map(w => { const limpo = w.txt.replace(/[.,!?;:]+$/, ''); return destaque.has(norm(limpo)) ? `<em>${esc(limpo)}</em>` : esc(limpo); }).join(' ');
    legHtml.push(`<div class="legenda" id="${j}" style="top:${y}px;opacity:0"><span>${txt}</span></div>`);
    tl.push(`tl.set("#${j}",{opacity:1},${n3(a)});tl.set("#${j}",{opacity:0},${n3(b)});`);
  });
}

// ---------- CSS ----------
const fonte = (nome, arq, peso, estilo = 'normal') => `@font-face{font-family:"${nome}";src:url("assets/fonts/${arq}.woff2") format("woff2");font-weight:${peso};font-style:${estilo};font-display:block}`;
css.push(fonte('Inter', 'inter-600', 600), fonte('Inter', 'inter-800', 800), fonte('Inter', 'inter-900', 900), fonte('Instrument Serif', 'instrument-serif-italic', 400, 'italic'));
css.push(`
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden;background:${M.escuro}}
#root{position:relative;width:100%;height:100%;overflow:hidden;background:${M.escuro};font-family:"Inter",sans-serif;color:#F5F7FA;--d:${M.destaque};--d2:${M.destaque2};--al:${M.alerta};--esc:${M.escuro};--cla:${M.claro}}
.camada{position:absolute;inset:0;overflow:hidden}
#cam-wrap{transform-origin:50% 38%}
#cam,#cam-painel,#pessoa{position:absolute;left:0;width:1080px;height:1920px;object-fit:cover}
#cam{top:0}
.split-fundo{position:absolute;inset:0;background:radial-gradient(70% 45% at 50% 32%,color-mix(in srgb,var(--d) 22%,var(--esc)) 0%,var(--esc) 70%)}
.painel{position:absolute;left:0;top:1240px;width:1080px;height:680px;border-radius:140px 140px 0 0;overflow:hidden;box-shadow:0 -10px 60px rgba(0,0,0,.45)}
.painel::before{content:"";position:absolute;inset:0;border-radius:inherit;border-top:3px solid color-mix(in srgb,var(--d) 70%,transparent);z-index:2;pointer-events:none}
.cabeca{position:absolute;left:0;top:0;width:1080px;height:1240px;overflow:hidden;z-index:3}
.split-visual{position:absolute;left:110px;right:110px;top:470px;height:500px}
.split-visual .linha.serif{font-size:min(var(--fs,132px),96px)!important}.split-visual .linha.sans{font-size:60px!important}.split-visual .icone{width:110px;height:110px}.split-visual .icone.infinito{width:220px;height:110px}.split-visual .k-titulo{gap:16px}
.split-visual .chat-corpo{min-height:110px}
.sv{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
.tela .tela-conteudo{position:absolute;left:110px;right:110px;top:470px;bottom:490px;display:flex;align-items:center;justify-content:center}
.fundo-claro{background:var(--cla);color:#0E1116}
.fundo-escuro{background:var(--esc)}
.fundo-alerta,.fundo-preto{background:#07090D}
.brilho-fundo{position:absolute;inset:-10%;background:radial-gradient(45% 30% at 50% 45%,color-mix(in srgb,var(--d) 26%,transparent),transparent 70%)}
.fundo-claro .brilho-fundo{background:radial-gradient(50% 32% at 50% 45%,color-mix(in srgb,var(--d) 18%,transparent),transparent 70%),repeating-linear-gradient(0deg,transparent 0 59px,rgba(14,17,22,.05) 59px 60px),repeating-linear-gradient(90deg,transparent 0 59px,rgba(14,17,22,.05) 59px 60px)}
.fundo-alerta .brilho-fundo{background:radial-gradient(45% 30% at 50% 45%,color-mix(in srgb,var(--al) 30%,transparent),transparent 70%)}
.k-titulo,.k-cal,.k-botao,.k-chat,.k-grade,.k-oferta,.k-fim{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;text-align:center;width:100%}
.rotulo{font:800 32px/1 "Inter";letter-spacing:.22em;text-transform:uppercase;color:var(--d)}
.fundo-claro .rotulo{color:var(--d2)}
.linha{display:block;line-height:1.02;text-wrap:balance}
.linha.serif{font:italic 400 132px/1 "Instrument Serif";text-transform:uppercase;letter-spacing:-.01em}
.linha.sans{font:800 76px/1.05 "Inter";letter-spacing:-.03em}
.cor-destaque{color:var(--d);text-shadow:0 0 34px color-mix(in srgb,var(--d) 55%,transparent)}
.cor-alerta{color:var(--al);text-shadow:0 0 38px color-mix(in srgb,var(--al) 55%,transparent)}
.fundo-claro .cor-destaque{color:var(--d2);text-shadow:none}
.mask{display:inline-block;overflow:hidden;vertical-align:top;padding:.08em .14em .16em;margin:-.08em -.14em -.16em}
.w{display:inline-block}
.icone{width:150px;height:150px;display:block}
.icone svg{width:100%;height:100%}
.icone.infinito{width:300px;height:150px}
.ic-c{fill:color-mix(in srgb,var(--d) 16%,transparent);stroke:var(--d);stroke-width:5}
.ic-l{fill:none;stroke:var(--d);stroke-width:9;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:420}
.icone.x .ic-c{fill:color-mix(in srgb,var(--al) 16%,transparent);stroke:var(--al)}.icone.x .ic-l{stroke:var(--al)}
.fundo-claro .ic-c{stroke:var(--d2)}.fundo-claro .ic-l{stroke:var(--d2)}
.cal{position:relative;width:520px;height:440px;border-radius:44px;background:linear-gradient(180deg,#fff,#E9EEF5);box-shadow:0 30px 80px rgba(0,0,0,.45),0 0 0 3px color-mix(in srgb,var(--d) 60%,transparent);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#0E1116}
.cal-topo{position:absolute;top:0;left:0;right:0;height:96px;border-radius:44px 44px 0 0;background:var(--d);display:flex;justify-content:center;gap:180px}
.cal-topo i{display:block;width:26px;height:64px;margin-top:-30px;border-radius:13px;background:#D7DEE8;box-shadow:inset 0 -6px 0 rgba(0,0,0,.18)}
.cal-data{font:900 180px/1 "Inter";letter-spacing:-.05em;margin-top:70px}
.cal-extra{position:absolute;right:-60px;bottom:-34px;padding:16px 26px;border-radius:999px;background:var(--esc);color:#fff;font:800 50px/1 "Inter";box-shadow:0 0 0 3px var(--d),0 0 40px color-mix(in srgb,var(--d) 60%,transparent)}
.k-botao{gap:60px;position:relative}
.botao{position:relative;display:inline-flex;align-items:center;gap:22px;padding:34px 64px;border-radius:999px;background:var(--d);color:#04121F;font:800 60px/1 "Inter";box-shadow:0 18px 60px color-mix(in srgb,var(--d) 50%,transparent)}
.botao b{font-size:56px}
.onda{position:absolute;left:50%;top:50%;width:200px;height:200px;margin:-100px 0 0 -100px;border-radius:50%;border:6px solid #fff;opacity:0}
.botao-wrap{position:relative}
.dedo{position:absolute;width:150px;height:195px;left:calc(62% - 57px);top:calc(50% - 12px);fill:#F3F5F8;stroke:#0E1116;stroke-width:3;filter:drop-shadow(0 12px 18px rgba(0,0,0,.45))}
.seta{font:900 110px/1 "Inter";color:var(--d);margin-top:-20px}
.chat-antes{position:absolute;font:800 60px/1.1 "Inter";color:#F5F7FA}
.chat-antes b{color:var(--d)}
.chat{width:100%;max-width:820px;border-radius:40px;background:#111B2E;box-shadow:0 30px 80px rgba(0,0,0,.5),0 0 0 2px color-mix(in srgb,var(--d) 45%,transparent);overflow:hidden;text-align:left}
.chat-topo{display:flex;align-items:center;gap:22px;padding:26px 32px;background:#16233B}
.avatar{width:84px;height:84px;border-radius:50%;background:#000;overflow:hidden;flex:none;display:grid;place-items:center}
.avatar img{width:150%;height:auto}
.chat-topo b{display:block;font:800 40px/1.1 "Inter";color:#fff}
.chat-topo small{font:600 28px/1.3 "Inter";color:#9FB0C8}
.chat-corpo{padding:30px 32px 36px;display:flex;flex-direction:column;gap:18px;min-height:150px}
.msg{align-self:flex-start;max-width:92%;padding:22px 28px;border-radius:28px 28px 28px 8px;background:#20304D;font:600 38px/1.3 "Inter";color:#EAF2FF}
.grade{display:grid;grid-template-columns:repeat(4,150px);gap:20px}
.gc{height:150px;border-radius:22px;background:linear-gradient(160deg,color-mix(in srgb,var(--d) 32%,#162238),#0F1A2D);box-shadow:0 0 0 2px color-mix(in srgb,var(--d) 35%,transparent);padding:18px;display:flex;flex-direction:column;gap:10px}
.gc i{display:block;width:44px;height:44px;border-radius:12px;background:color-mix(in srgb,var(--d) 75%,#fff)}
.gc span{display:block;height:12px;border-radius:6px;background:rgba(255,255,255,.3)}
.gc span.c{width:60%}
.k-oferta{flex-direction:row;gap:24px;align-items:stretch}
.of{position:relative;overflow:hidden;width:380px;padding:40px 28px 44px;border-radius:40px;background:linear-gradient(170deg,#152440,#0B1426);box-shadow:0 0 0 3px color-mix(in srgb,var(--d) 55%,transparent),0 24px 60px rgba(0,0,0,.45);text-align:center}
.of-simb{height:150px;display:flex;align-items:center;justify-content:center;font:900 130px/1 "Inter";color:var(--d);text-shadow:0 0 40px color-mix(in srgb,var(--d) 60%,transparent)}
.of-simb svg{width:250px;height:125px}
.of-tit{font:800 44px/1.1 "Inter";white-space:nowrap;margin-top:14px}
.of-sub{font:italic 400 44px/1.1 "Instrument Serif";color:#B8C6DA;margin-top:10px}
.brilho{position:absolute;top:-20%;bottom:-20%;left:0;width:35%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.18),transparent);transform:skewX(-18deg)}
.k-fim .logo{width:820px;height:auto}
.botao.fim{margin-top:10px}
#palco{position:absolute;inset:0;transform-origin:50% 45%}
#flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}
.legenda{position:absolute;left:110px;right:110px;text-align:center;transform:translateY(-50%)}
.legenda span{font:800 84px/1.08 "Inter";letter-spacing:-.03em;color:#fff;text-shadow:0 4px 16px rgba(0,0,0,.55),0 0 2px rgba(0,0,0,.6)}
.legenda em{font-style:normal;color:var(--d);text-shadow:0 0 26px color-mix(in srgb,var(--d) 60%,transparent),0 4px 16px rgba(0,0,0,.55)}
.selo{position:absolute;left:110px;right:110px;top:500px;text-align:center}
.selo span{display:inline-block;padding:14px 26px;border-radius:999px;background:color-mix(in srgb,var(--esc) 82%,transparent);font:800 34px/1 "Inter";letter-spacing:.12em;text-transform:uppercase;box-shadow:0 0 0 2px var(--d)}
`);

const doc = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1080, height=1920" />
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<!-- Gerado por templates/editorial-tech/montar.mjs a partir de cenas.json. Para mudar, edite cenas.json e rode de novo. -->
<style>${css.join('\n')}</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${DT}" data-width="1080" data-height="1920">
<div id="palco">
${html.join('\n')}
</div>
<div id="flash" data-layout-allow-overflow></div>
${legHtml.join('\n')}
<audio id="voz" data-audio-group="voiceover" src="assets/voz.wav" data-start="0" data-duration="${D}" data-track-index="3" data-volume="1"></audio>${musica ? `
<audio id="music" data-audio-group="music" src="${musica.src}" data-start="0" data-media-start="${musica.inicio}" data-duration="${DT}" data-track-index="9" data-volume="${musica.volume}" data-automation='${JSON.stringify({ version: 1, lanes: [{ target: 'volume', points: [{ t: 0, v: 0 }, { t: 0.25, v: 1 }, { t: Number((DT - 1.1).toFixed(3)), v: 1 }, { t: DT, v: 0 }] }] })}'></audio>` : ''}
${audios.join('\n')}
</div>
<script>
document.fonts.load('800 84px "Inter"').then(() => document.fonts.load('italic 132px "Instrument Serif"')).then(() => document.fonts.ready).then(() => {
  const tl = gsap.timeline({ paused: true });
  ${tl.join('\n  ')}
  window.__timelines["main"] = tl;
  if (window.__hfForceTimelineRebind) window.__hfForceTimelineRebind();
});
</script>
</body>
</html>
`;
writeFileSync(join(comp, 'index.html'), doc);

// Trilha sob a voz: carve do HyperFrames (mergulhos nas frequências da voz que seguem a fala + nivelamento lento).
// Precisa de @hyperframes/core: instala uma vez em node_modules/ do kit (fora do Git).
let mixagem = '';
if (musica) {
  const carve = ['.claude', '.agents', '.codex'].map(d => join(homedir(), d, 'skills', 'hyperframes-audio', 'scripts', 'carve.mjs')).find(p => existsSync(p));
  const core = join(KIT, 'node_modules', '@hyperframes', 'core');
  if (carve && !existsSync(core)) spawnSync(`npm i --no-save --no-package-lock --no-audit --no-fund --prefix "${KIT}" @hyperframes/core`, { shell: true, stdio: 'inherit' });
  const r = carve && existsSync(core) ? spawnSync(process.execPath, [carve, '--comp', join(comp, 'index.html'), '--bed', 'music', '--voice', 'voz', '--strength', String(musica.carve), '--core', KIT], { encoding: 'utf8' }) : null;
  if (r?.status === 0) mixagem = 'trilha com carve sob a voz';
  else {
    // Plano B: a trilha baixa onde há fala (ataque 0,1 s, volta em 0,6 s), multiplicada pelo fade de entrada e saída.
    const fala = [];
    for (const p of palavras) { const u = fala.at(-1); if (u && p.t - u[1] < 0.4) u[1] = Math.max(u[1], p.f); else fala.push([p.t, p.f]); }
    const reserva = t => fala.some(([a, b]) => t >= a - 0.1 && t <= b + 0.6) ? 0.22 : 1;
    const fade = t => Math.min(1, t / 0.25, Math.max(0, (DT - t) / 1.1));
    const marcas = [...new Set([0, 0.25, DT - 1.1, DT, ...fala.flatMap(([a, b]) => [a - 0.2, a - 0.1, b + 0.6, b + 0.7])])].filter(t => t >= 0 && t <= DT).sort((a, b) => a - b);
    const pontos = marcas.map(t => ({ t: Number(t.toFixed(3)), v: Number((reserva(t) * fade(t)).toFixed(3)) }));
    const html2 = readFileSync(join(comp, 'index.html'), 'utf8').replace(/(<audio id="music"[^>]*data-automation=')[^']*(')/, `$1${JSON.stringify({ version: 1, lanes: [{ target: 'volume', points: pontos }] })}$2`);
    writeFileSync(join(comp, 'index.html'), html2);
    mixagem = 'trilha com reserva de volume simples (carve do HyperFrames indisponível: ' + (r ? String(r.stderr || r.stdout).trim().split('\n').at(-1) : 'skill hyperframes-audio não encontrada') + ')';
  }
}
// design.md da marca dentro da composição (o HyperFrames trata como verdade da marca)
copyFileSync(join(KIT, 'marca/design.md'), join(comp, 'design.md'));
const nLeg = legHtml.length, nCenas = cenas.length;
console.log(`✓ Composição montada: ${relative(process.cwd(), join(comp, 'index.html'))} — ${DT.toFixed(2)} s, ${nCenas} cenas, ${nLeg} legendas, ${audios.length} efeitos${temPessoa ? '' : ' (sem pessoa.webm: split sem cabeça sobre o painel)'}`);
if (musica) console.log(`  ♪ ${mixagem}; música a partir de ${musica.inicio.toFixed(2)} s, ${(60 / musica.periodo).toFixed(1)} BPM, ${musica.acertos.length}/${cenas.length - 1} trocas de cena na batida${musica.ajustadas.length ? ` (movidas para a batida: ${musica.ajustadas.join(', ')})` : ''}`);
