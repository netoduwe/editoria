// Módulo (não é comando): medições de imagem usadas por analisar-referencia.mjs e quadro.mjs.
// - movimento global de câmera entre dois quadros (zoom + pan + giro) por casamento de blocos;
// - linhas de texto num quadro (tamanho, posição, peso aparente, cor), sem OCR: só geometria.
import { spawnSync } from "node:child_process";

const ffRaw = (args) => spawnSync("ffmpeg", ["-hide_banner", "-v", "error", ...args, "-f", "rawvideo", "-"], { maxBuffer: 1024 * 1024 * 1024 }).stdout;

// Percorre o vídeo em blocos de 30 s (memória baixa) e entrega cada quadro reduzido: cb(quadro, t).
export function paraCadaQuadro(video, { fps, largura, altura, formato = "gray", ate }, cb) {
  const bpp = formato === "gray" ? 1 : 3, tam = largura * altura * bpp;
  for (let ini = 0; ini < ate; ini += 30) {
    const dur = Math.min(30, ate - ini);
    const raw = ffRaw(["-ss", ini.toFixed(3), "-t", dur.toFixed(3), "-i", video, "-an", "-vf", `fps=${fps},scale=${largura}:${altura}:flags=area,format=${formato}`]);
    const n = Math.floor((raw?.length ?? 0) / tam);
    for (let i = 0; i < n; i++) cb(raw.subarray(i * tam, (i + 1) * tam), ini + i / fps);
  }
}

// Um quadro em cinza ou RGB, num tamanho dado.
export function quadro(video, t, largura, altura, formato = "gray") {
  return ffRaw(["-ss", Math.max(0, t).toFixed(3), "-i", video, "-frames:v", "1", "-an", "-vf", `scale=${largura}:${altura}:flags=area,format=${formato}`]);
}

// ---------------------------------------------------------------- movimento global
const reduz = (f, w, h) => {
  const w2 = w >> 1, h2 = h >> 1, o = new Uint8Array(w2 * h2);
  for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) { const i = 2 * y * w + 2 * x; o[y * w2 + x] = (f[i] + f[i + 1] + f[i + w] + f[i + w + 1] + 2) >> 2; }
  return o;
};
const sad = (a, b, w, ax, ay, bx, by, s) => {
  let d = 0;
  for (let y = 0; y < s; y++) { let ia = (ay + y) * w + ax, ib = (by + y) * w + bx; for (let x = 0; x < s; x++) d += Math.abs(a[ia++] - b[ib++]); }
  return d;
};

// Vetores de deslocamento de blocos texturizados entre A e B (pirâmide de 2 níveis).
// alcance: busca no nível reduzido (±alcance px = ±2·alcance px no tamanho cheio).
function vetores(A, B, w, h, { bloco = 16, alcance = 8, maxBlocos = 48 } = {}) {
  const a1 = reduz(A, w, h), b1 = reduz(B, w, h), w1 = w >> 1, h1 = h >> 1, b = bloco >> 1;
  const cand = [];
  for (let by = bloco; by + 2 * bloco <= h; by += bloco) for (let bx = bloco; bx + 2 * bloco <= w; bx += bloco) {
    let s = 0, s2 = 0;
    for (let y = 0; y < bloco; y++) for (let x = 0; x < bloco; x++) { const v = A[(by + y) * w + bx + x]; s += v; s2 += v * v; }
    const n = bloco * bloco, dp = Math.sqrt(Math.max(0, s2 / n - (s / n) ** 2));
    if (dp >= 8) cand.push({ bx, by });
  }
  const passo = Math.max(1, cand.length / maxBlocos);
  const usados = [];
  for (let i = 0; i < cand.length && usados.length < maxBlocos; i += passo) usados.push(cand[Math.floor(i)]);
  const vs = [];
  for (const { bx, by } of usados) {
    const cx = bx >> 1, cy = by >> 1;
    let melhor = Infinity, vx = 0, vy = 0;
    for (let dy = -alcance; dy <= alcance; dy++) for (let dx = -alcance; dx <= alcance; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x + b > w1 || y + b > h1) continue;
      const d = sad(a1, b1, w1, cx, cy, x, y, b);
      if (d < melhor) { melhor = d; vx = dx; vy = dy; }
    }
    let melhor0 = Infinity, ux = 0, uy = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const x = bx + 2 * vx + dx, y = by + 2 * vy + dy;
      if (x < 0 || y < 0 || x + bloco > w || y + bloco > h) continue;
      const d = sad(A, B, w, bx, by, x, y, bloco);
      if (d < melhor0) { melhor0 = d; ux = 2 * vx + dx; uy = 2 * vy + dy; }
    }
    if (melhor0 / (bloco * bloco) > 25) continue; // o conteúdo do bloco mudou: não é movimento
    vs.push({ X: bx + bloco / 2 - w / 2, Y: by + bloco / 2 - h / 2, dx: ux, dy: uy });
  }
  return vs;
}

// Ajuste robusto de semelhança: dx = k·X − r·Y + tx ; dy = r·X + k·Y + ty (X, Y a partir do centro).
function ajustar(vs) {
  let usa = vs, p = null;
  for (let it = 0; it < 3 && usa.length >= 6; it++) {
    let sXX = 0, sX = 0, sY = 0, bk = 0, br = 0, bx = 0, by = 0;
    const n = usa.length;
    for (const v of usa) { sXX += v.X * v.X + v.Y * v.Y; sX += v.X; sY += v.Y; bk += v.X * v.dx + v.Y * v.dy; br += -v.Y * v.dx + v.X * v.dy; bx += v.dx; by += v.dy; }
    const M = [[sXX, 0, sX, sY, bk], [0, sXX, -sY, sX, br], [sX, -sY, n, 0, bx], [sY, sX, 0, n, by]];
    for (let i = 0; i < 4; i++) {
      let m = i; for (let j = i + 1; j < 4; j++) if (Math.abs(M[j][i]) > Math.abs(M[m][i])) m = j;
      [M[i], M[m]] = [M[m], M[i]];
      if (Math.abs(M[i][i]) < 1e-9) return null;
      for (let j = 0; j < 4; j++) if (j !== i) { const f = M[j][i] / M[i][i]; for (let c = i; c < 5; c++) M[j][c] -= f * M[i][c]; }
    }
    p = { k: M[0][4] / M[0][0], r: M[1][4] / M[1][1], tx: M[2][4] / M[2][2], ty: M[3][4] / M[3][3] };
    const res = vs.map((v) => Math.hypot(p.k * v.X - p.r * v.Y + p.tx - v.dx, p.r * v.X + p.k * v.Y + p.ty - v.dy));
    usa = vs.filter((_, i) => res[i] <= 1.5);
    p.inliers = usa.length / vs.length;
  }
  return p;
}

// Movimento da imagem de A para B. escala > 1 = aproxima (zoom in); tx/ty em fração da largura (conteúdo → direita/baixo > 0).
// confianca = fração dos blocos que seguem o mesmo movimento (baixa = borrão, troca de conteúdo ou fade).
export function movimentoGlobal(A, B, w, h, opcoes) {
  const vs = vetores(A, B, w, h, opcoes);
  const p = vs.length >= 6 ? ajustar(vs) : null;
  if (!p) return { blocos: vs.length, confianca: 0, escala: 1, tx: 0, ty: 0, giro_graus: 0, centro: null };
  const centro = Math.abs(p.k) > 0.004 ? { x: 0.5 - p.tx / p.k / w, y: 0.5 - p.ty / p.k / h } : null; // ponto fixo do zoom (0–1)
  return { blocos: vs.length, confianca: p.inliers, escala: 1 + p.k, tx: p.tx / w, ty: p.ty / w, giro_graus: (p.r * 180) / Math.PI, centro };
}

// ---------------------------------------------------------------- linhas de texto
// Texto = traços de alto contraste sobre fundo localmente liso, letras de altura parecida na mesma linha de base.
// Mede a altura das maiúsculas (topo das letras altas → linha de base), a espessura do traço e a cor.
// Estimativa geométrica: confirme sempre na grade (fotos com grafismos podem enganar).
export function linhasDeTexto(rgb, W, H) {
  const N = W * H;
  const Y = new Uint8Array(N), V = new Uint8Array(N);
  for (let i = 0; i < N; i++) { const r = rgb[3 * i], g = rgb[3 * i + 1], b = rgb[3 * i + 2]; Y[i] = (77 * r + 150 * g + 29 * b) >> 8; V[i] = Math.max(r, g, b); }
  const raio = Math.max(8, Math.round(Math.min(W, H) / 24));
  const encontradas = [];
  // canais × polaridades: cinza escuro-sobre-claro e claro-sobre-escuro; brilho máximo pega texto colorido sobre fundo escuro
  for (const [canal, pol] of [[Y, -1], [Y, 1], [V, 1]]) encontradas.push(...linhasNoCanal(canal, pol, W, H, raio, rgb));
  // a mesma linha achada em dois canais: fica a de maior contraste
  encontradas.sort((a, b) => b.contraste - a.contraste);
  const finais = [];
  for (const l of encontradas) {
    const repetida = finais.some((f) => {
      const ix = Math.max(0, Math.min(f.x1, l.x1) - Math.max(f.x0, l.x0)), iy = Math.max(0, Math.min(f.y1, l.y1) - Math.max(f.y0, l.y0));
      return ix * iy > 0.4 * Math.min((l.x1 - l.x0) * (l.y1 - l.y0), (f.x1 - f.x0) * (f.y1 - f.y0));
    });
    if (!repetida) finais.push(l);
  }
  return finais.sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
}

function linhasNoCanal(g, pol, W, H, raio, rgb) {
  const I = new Float64Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) { let s = 0; for (let x = 0; x < W; x++) { s += g[y * W + x]; I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + s; } }
  const m = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    const y0 = Math.max(0, y - raio), y1 = Math.min(H, y + raio + 1);
    for (let x = 0; x < W; x++) {
      const x0 = Math.max(0, x - raio), x1 = Math.min(W, x + raio + 1);
      const fundo = (I[y1 * (W + 1) + x1] - I[y0 * (W + 1) + x1] - I[y1 * (W + 1) + x0] + I[y0 * (W + 1) + x0]) / ((x1 - x0) * (y1 - y0));
      const v = g[y * W + x];
      if (pol * (v - fundo) > 40 && (pol > 0 ? v > 140 : v < 120)) m[y * W + x] = 1;
    }
  }
  // componentes conectados (8 vizinhos)
  const rot = new Int32Array(W * H).fill(-1), pilha = new Int32Array(W * H), comps = [];
  for (let i = 0; i < W * H; i++) {
    if (!m[i] || rot[i] >= 0) continue;
    let sp = 0, x0 = W, y0 = H, x1 = 0, y1 = 0, area = 0;
    const id = comps.length;
    pilha[sp++] = i; rot[i] = id;
    while (sp) {
      const j = pilha[--sp], x = j % W, y = (j - x) / W;
      area++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const k = yy * W + xx;
        if (m[k] && rot[k] < 0) { rot[k] = id; pilha[sp++] = k; }
      }
    }
    comps.push({ id, x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1, area });
  }
  const menor = Math.min(W, H);
  // letra (ou palavra com letras coladas, comum em fonte pesada com espaçamento apertado)
  const letras = comps.filter((c) => c.h >= menor * 0.012 && c.h <= menor * 0.35 && c.w >= 2 && c.w <= c.h * 6 &&
    c.area / (c.w * c.h) > 0.12 && c.area / (c.w * c.h) < 0.9 && c.x0 > 0 && c.y0 > 0 && c.x1 < W - 1 && c.y1 < H - 1);
  for (const c of letras) { // espessura do traço = corrida horizontal mediana de tinta
    const runs = [];
    for (let y = c.y0; y <= c.y1; y += Math.max(1, c.h >> 3)) {
      let run = 0;
      for (let x = c.x0; x <= c.x1 + 1; x++) { if (x <= c.x1 && rot[y * W + x] === c.id) run++; else if (run) { runs.push(run); run = 0; } }
    }
    runs.sort((a, b) => a - b);
    c.traco = runs[runs.length >> 1] ?? 1;
  }
  letras.sort((a, b) => a.x0 - b.x0);
  const pai = letras.map((_, i) => i);
  const raiz = (i) => (pai[i] === i ? i : (pai[i] = raiz(pai[i])));
  for (let i = 0; i < letras.length; i++) for (let j = i + 1; j < letras.length; j++) {
    const a = letras[i], b = letras[j];
    if (b.x0 - a.x1 > 1.1 * Math.max(a.h, b.h)) break;
    const sobreposicao = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0), razao = a.h / b.h;
    if (sobreposicao > 0.45 * Math.min(a.h, b.h) && razao > 0.4 && razao < 2.5 && Math.abs(a.y1 - b.y1) < 0.3 * Math.max(a.h, b.h)) pai[raiz(j)] = raiz(i);
  }
  const grupos = new Map();
  letras.forEach((c, i) => { const k = raiz(i); if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(c); });
  const linhas = [];
  for (const gr of grupos.values()) {
    const x0 = Math.min(...gr.map((c) => c.x0)), x1 = Math.max(...gr.map((c) => c.x1)), y0 = Math.min(...gr.map((c) => c.y0)), y1 = Math.max(...gr.map((c) => c.y1));
    const tops = gr.map((c) => c.y0).sort((a, b) => a - b), bases = gr.map((c) => c.y1).sort((a, b) => a - b);
    const topo = tops[Math.floor(tops.length * 0.1)], base = bases[Math.floor(bases.length * 0.5)];
    const maiuscula = base - topo + 1;
    // todas as letras com o mesmo topo: linha só de maiúsculas OU só de minúsculas sem hastes (aí mede a altura-x)
    const uniforme = tops[Math.floor((tops.length - 1) * 0.9)] - topo < 0.12 * maiuscula;
    const colada = gr.some((c) => c.w > 1.6 * c.h) && x1 - x0 > 2.5 * maiuscula;
    if (gr.length < 3 && !colada) continue;
    // contraste tinta × fundo e textura do fundo dentro da caixa
    let si = 0, ni = 0, sf = 0, sf2 = 0, nf = 0, cr = 0, cg = 0, cb = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * W + x, v = g[i];
      if (m[i]) { si += v; ni++; cr += rgb[3 * i]; cg += rgb[3 * i + 1]; cb += rgb[3 * i + 2]; } else { sf += v; sf2 += v * v; nf++; }
    }
    if (!ni || !nf) continue;
    const contraste = Math.abs(si / ni - sf / nf), dpFundo = Math.sqrt(Math.max(0, sf2 / nf - (sf / nf) ** 2));
    const traco = gr.map((c) => c.traco).sort((a, b) => a - b)[gr.length >> 1], tracoRel = traco / maiuscula;
    const aceita = contraste >= 90 && dpFundo <= 60 && tracoRel >= 0.08 && tracoRel <= 0.45 && (gr.length >= 3 || (contraste >= 120 && dpFundo <= 45));
    if (!aceita) continue;
    const hex = "#" + [cr, cg, cb].map((s) => Math.round(s / ni).toString(16).padStart(2, "0")).join("").toUpperCase();
    linhas.push({ x0, y0, x1, y1, letras: gr.length, maiuscula, uniforme, traco, tracoRel, contraste, cor: hex, polaridade: pol > 0 ? "claro sobre escuro" : "escuro sobre claro" });
  }
  return linhas;
}

// Classe tipográfica pela altura das maiúsculas em relação ao LADO MENOR do quadro
// (altura no horizontal, largura no vertical): vale igual para 16:9, 4:3 e 9:16.
export function classeTexto(rel) {
  return rel >= 0.12 ? "hero/estatística" : rel >= 0.06 ? "título de cena" : rel >= 0.03 ? "legenda/fala" : "rótulo/pequeno";
}
export const pesoAparente = (tracoRel) => (tracoRel >= 0.17 ? "pesado (bold/black)" : tracoRel >= 0.12 ? "médio (semibold)" : "fino (regular/serifa)");

// Resumo de uma linha em números úteis para a receita.
export function descreverLinha(l, W, H) {
  const menor = Math.min(W, H), rel = l.maiuscula / menor;
  const em1080 = Math.round(rel * 1080); // altura das maiúsculas num quadro de 1080 px no lado menor (ex.: 1080×1920)
  return {
    caixa_px: [l.x0, l.y0, l.x1 - l.x0 + 1, l.y1 - l.y0 + 1],
    centro_pct: { x: Number(((100 * (l.x0 + l.x1)) / 2 / W).toFixed(1)), y: Number(((100 * (l.y0 + l.y1)) / 2 / H).toFixed(1)) },
    altura_maiusculas_px: l.maiuscula,
    altura_pct_lado_menor: Number((100 * rel).toFixed(1)),
    // sans: maiúscula ≈ 0,72 do corpo; linha só de minúsculas mede a altura-x (≈ 0,55): aí o corpo fica numa faixa
    corpo_estimado_px: l.uniforme ? [Math.round(l.maiuscula / 0.72), Math.round(l.maiuscula / 0.55)] : Math.round(l.maiuscula / 0.72),
    em_1080: { altura_maiusculas_px: em1080, largura_px: Math.round(((l.x1 - l.x0 + 1) * 1080) / menor), corpo_css_px: l.uniforme ? [Math.round(em1080 / 0.72), Math.round(em1080 / 0.55)] : Math.round(em1080 / 0.72) },
    topo_uniforme: l.uniforme,
    classe: classeTexto(rel),
    peso: pesoAparente(l.tracoRel),
    traco_rel: Number(l.tracoRel.toFixed(2)),
    cor: l.cor,
    polaridade: l.polaridade,
    letras: l.letras,
  };
}
