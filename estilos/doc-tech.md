---
nome: doc-tech
descricao: Documental investigativo premium (estilo Vox, Bloomberg Originals, Johnny Harris) — foto de arquivo, câmera que viaja para dentro do cenário, tipografia brutalista monocromática e uma única palavra em vermelho
referencias:
  - { arquivo: "07_final_hook.mp4", tema: "gancho de 7 s sobre Geoffrey Hinton, 'The Godfather of AI'", analisado_em: 2026-10-15 }
formato: { largura: 1080, altura: 1920, fps: 30 }   # original: 1440x1080 (4:3), 23.976 fps, 7,06 s — adaptado para vertical (veja "Adaptações")
dna:
  - fotografia de arquivo em P&B sobre fundo off-white com vinheta, montada em camadas no início, com rótulo e seta de anotação     # observado
  - sem cortes: a câmera viaja por dentro do cenário — mergulho (whip-zoom) na lousa da foto, depois whip pan para baixo até a tela do terminal   # medido: 0 cortes, 2 trocas por câmera
  - profundidade de campo (rack focus): o personagem fica desfocado na borda e a lousa vira o palco do texto     # observado
  - tipografia brutalista sem serifa (Inter 800/900) com hierarquia extrema: o número domina com maiúscula de 17% do quadro   # medido
  - texto diegético: o ápice aparece dentro da tela de um monitor CRT, com vidro, scanlines e brilho de fósforo   # observado
  - monocromático, com uma única palavra-ápice acendendo em vermelho, com uma piscada curta, no instante em que é dita   # medido: alerta_estilo
ritmo:
  plano_medio_s: 7.06            # medido (1 plano: não há corte)
  cortes_por_minuto: 0           # medido
  trocas_por_camera: 2           # medido (whip-zoom 1,0–1,6 s · whip pan 2,6–3,2 s)
  cena_media_s: 1.95             # medido (cenas estáveis: 0–1,0 · 1,6–2,6 · 3,2–7,06 s)
  cortes_nos_3s_iniciais: 0      # medido (o gancho troca de cena 2 vezes até 3,2 s, pela câmera)
  animacoes_por_minuto: 42.5     # medido (5 picos: montagem da foto, mergulho, "10-20%", whip pan, fade)
  pausa_maxima_mantida_s: 1.1    # medido (pausas p90: respiros dramáticos mantidos)
  max_planos_sem_pessoa: "n/a"   # observado: não há apresentador; o personagem é a foto
layouts:   # medido: duração de cada cena, com cada troca por câmera dividida ao meio
  - { nome: arquivo-geral,   pct: 18, funcao: "apresentar o fato/personagem com foto histórica, título e rótulo", geometria: "título y 480–700 · foto 4:3 [110, 760, 820×615] (y 760–1375) · rótulo + seta curva sobre a foto · fundo off-white com vinheta" }
  - { nome: incursao-lousa,  pct: 23, funcao: "revelar o dado massivo dentro do cenário", geometria: "câmera dentro da lousa · personagem desfocado saindo pela borda direita · bloco x 110–930: fala y≈700, número y≈800–1010, complemento y≈1080" }
  - { nome: tela-crt,        pct: 59, funcao: "conclusão dramática dentro de um monitor retrô", geometria: "monitor em perspectiva (rotateY −12°) · tela x 110–930, y 640–1300 · 3 linhas alinhadas à esquerda a partir de y≈790" }
  - { nome: apresentador-doc, pct: 0, funcao: "o criador dá contexto ou fecha", geometria: "câmera cheia, luz contrastada, fundo escuro" }   # proposto: não aparece na referência
legenda:   # a fala conectiva que se monta no cenário ("says there's a")
  fonte: { familia: "Inter", peso: 800, arquivo: "fontes/inter-800.woff2", original_parecida_com: "Neue Haas Grotesk / Helvetica Now Bold" }   # observado
  tamanho_px: 81                 # medido: maiúscula 58 px (5,4% do lado menor) → corpo 81
  caixa: normal
  espacamento_em: -0.02          # testado
  palavras_por_vez: "1-3"        # observado
  troca: acumula                 # observado: a frase se monta palavra a palavra e fica até a câmera sair
  sincronia: "no início da palavra falada"   # observado (gancho a 10 qps × transcrição)
  cor: { fundo_escuro: "#F1F1ED", fundo_claro: "#3E3D3C" }   # medido (cor das linhas de texto detectadas)
  contorno: nenhum
  sombra: "nenhuma no papel (tinta impressa: filtro #tinta) · brilho 0 0 8px rgba(255,255,255,.35) na tela CRT"   # testado
  fundo: nenhum
  posicao_y: { arquivo: "480–700", lousa: "≈700", crt: "790–1150" }
  entrada: "corte seco na palavra (0 ms), sem fade, elástico ou bounce"   # observado
  destaque: { metodo: "vermelho com brilho de fósforo", cor: "#FA3B2B", frequencia: "1 palavra no vídeo inteiro: a palavra-ápice", entrada: "piscada de ~0,6 s alternando vermelho, branco e borrado (6 trocas no 1º segundo)", sincronia: "acende em 4,70 s; a palavra é dita em 4,72 s" }   # medido: alerta_estilo
titulos:
  fonte: { familia: "Inter", peso: 900, arquivo: "fontes/inter-900.woff2" }
  tamanho_px: [100, 224]   # medido: "“Godfather”" maiúscula 72 → corpo 100 · "10-20%" maiúscula 184 → corpo 256 na mesma proporção; testado 224 com nowrap para caber em 820 px
  tamanho_crt_px: 117      # medido: linhas da tela com maiúscula 84–90 → corpo 117–125
  rotulos_px: [25, 40]     # medido: "Geoffrey Hinton" maiúscula 18 → 25 · "The" 29 → 40
  caixa: normal            # observado: aspas curvas “ ” no apelido; o % menor e mais leve que os dígitos
superficies: "papel/lousa (tinta impressa com borda irregular) · tela CRT (vidro com reflexo, scanlines, fósforo)"   # observado
profundidade: "rack focus na lousa: o personagem desfocado (≈15 px em 1080) sai pela borda direita; o foco fica no texto"   # observado; blur testado
cores:
  fundo_claro:  { referencia: "#FCFCFC", usar: marca.fundo_claro }    # medido (paleta: papel com vinheta)
  fundo_escuro: { referencia: "#1E1E1E", usar: marca.fundo_escuro }   # medido (paleta)
  tela_crt:     { referencia: "#5C5C5C → #8A8A8A", usar: "mesma" }    # medido (quadro.mjs --cor a 6,3 s: tela cinza, mais clara no alto à direita pelo reflexo)
  moldura_crt:  { referencia: "#111111", usar: "mesma" }              # medido
  texto_papel:  { referencia: "#3E3D3C", usar: "#3E3D3C" }            # medido
  texto_crt:    { referencia: "#F1F1ED", usar: "#F1F1ED" }            # medido
  destaque_1:   { referencia: "#FA3B2B (núcleo da letra) · #D14639 (média com o brilho)", usar: marca.destaque }   # medido
  imagem: "clara (brilho 171/255), saturação 0,8: P&B; cor saturada em só 27% dos quadros (a palavra-ápice)"   # medido
movimento:
  camera_continua:   # medido (tabela "Câmera" do analise.md)
    - { de: arquivo-geral, para: incursao-lousa, tipo: "whip-zoom (mergulho)", duracao_s: 0.6, escala: "≥ 1,5 (o borrão esconde parte; testado 2,6)", vai_para: "a lousa (x 42%, y 51% do quadro original)", ease: power3.inOut, borrao: "sim, pico no meio" }
    - { de: incursao-lousa, para: tela-crt, tipo: "whip pan para baixo + zoom leve", duracao_s: 0.6, desce_pct: 28, escala: 1.17, ease: power3.inOut, borrao: sim }
  push_lento: "tela-crt: escala ×1,028 em 3,1 s (0,9%/s) até o fade"   # medido
  revelacao_texto: "corte seco na palavra falada (0 ms)"                 # observado
  montagem_inicial: "a foto se monta em camadas em ~0,25 s: lousa → terminal → pessoa"   # observado (gancho a 10 qps)
  entrada_saida: "entra a partir de tela branca (0–0,2 s) · fade para branco no fim (6,47–6,73 s)"   # medido
  transicoes: { corte_seco_pct: 0, outras: ["mergulho 0,6 s", "whip pan 0,6 s", "fade para branco 0,27 s"] }   # medido
audio:
  loudness_lufs: -27.5          # medido na referência; a entrega vai a −14 com scripts/masterizar.mjs
  trilha: { usar: "não", abaixo_da_voz_db: null, clima: "silêncio real nas pausas" }   # medido · proposto, se o aluno pedir: drone grave 26 dB abaixo da voz
  sfx: { nos_cortes_pct: 0, tipos: ["swoosh analógico suave no mergulho e no whip", "tecla mecânica na tela CRT"] }   # proposto: a referência não tem batida sonora medida nas trocas
gancho: "quadro 0 já tem texto ('The') sobre branco; a foto se monta em 0,25 s; o apelido entre aspas entra em 0,16 s com a fala; mergulho em 1,0 s leva ao número"   # medido + observado
final: "conclusão na tela CRT com a palavra-ápice em vermelho, segurada ~1,7 s com push lento; fade para branco"   # medido
---

# Estilo: doc-tech

Inspirado no gancho de `07_final_hook.mp4`. É uma referência de alto nível para temas de inteligência artificial, história, tecnologia e impacto futuro.

## DNA e filosofia
Ao contrário de Reels comuns, com jump cuts a cada 0,8 s e elementos voando, o `doc-tech` cria **tensão e autoridade**:
1. **Fotografia e arquivo real:** a narrativa se ancora num elemento real (foto de arquivo, documento oficial, recorte histórico).
2. **Jornada de câmera contínua:** não há corte de cena para cena. A câmera passeia por dentro do cenário: da foto inteira para a lousa e da lousa para a tela do terminal (DEC VT100).
3. **Ancoragem cenográfica:** o texto não flutua solto. Ele mora nas superfícies: impresso na lousa ao lado do personagem, em fósforo na tela de um terminal antigo.
4. **Impacto brutalista:** o número ganha corpo descomunal (maiúscula de 17% do quadro). O dado fala mais alto que qualquer efeito.
5. **Acento cirúrgico:** a peça é sóbria e monocromática. Só no momento mais crítico ("humanity.") uma palavra acende em vermelho, com uma piscada curta, no instante em que é dita.

## Gramática (como decidir)
- Fato ou personagem → **arquivo-geral** (foto + título + rótulo).
- Número, estatística ou dado → **incursao-lousa**: a câmera mergulha num elemento da foto que vira superfície, e o número domina.
- Conclusão, alerta ou frase de impacto → **tela-crt** (ou outra tela/superfície do próprio cenário).
- Cada troca de cena é um movimento de câmera para um elemento **que já estava visível** no plano anterior. É isso que faz a viagem parecer contínua.
- Uma palavra em vermelho por vídeo, só a palavra-ápice. Todo o resto é preto, cinza e branco.

## Anatomia das 3 cenas do gancho

### 1. O arquivo (0,00–1,0 s; mergulho 1,0–1,6 s)
- **Entrada:** o vídeo começa branco com "The" (0–0,2 s) e a foto se monta em camadas (lousa → terminal → pessoa) em ~0,25 s.
- **Fundo:** off-white `#FCFCFC` com vinheta suave nas bordas.
- **Foto:** P&B, borda branca fina, leve sombra. Rótulo pequeno ("Geoffrey Hinton", corpo 25) com seta curva de anotação até a cabeça.
- **Título:** "The" (corpo 40) · "“Godfather”" (Inter 900, corpo 100, aspas curvas) · "of AI", palavra a palavra com a fala.

### 2. A incursão na lousa (1,6–2,6 s; whip pan 2,6–3,2 s)
- **Transição:** mergulho de 0,6 s (power3.inOut) para dentro da lousa da foto, com desfoque de movimento no meio.
- **Rack focus:** o personagem fica na borda direita, desfocado (≈15 px), como moldura.
- **Texto na lousa** (tinta impressa, `#3E3D3C`):
  - "says there's a" — Inter 800, corpo 81
  - "10-20%" — Inter 900, corpo 224 (o % a 62% do tamanho, mais leve)
  - "chance" — Inter 800, corpo ~116 (testado; a medida pela haste do "h" dá 126)

### 3. O mergulho no terminal CRT (3,2–7,06 s)
- **Transição:** whip pan para baixo (a câmera desce 28% do quadro, zoom ×1,17) em 0,6 s até a tela do terminal que estava na foto.
- **Tela:** cinza `#5C5C5C → #8A8A8A` (reflexo no alto à direita), moldura `#111`, scanlines finas e reflexo de vidro. Monitor em perspectiva.
- **Texto** (Inter 800, corpo 117, alinhado à esquerda, entrelinha 0,92): "AI will" / "wipe out" em fósforo `#F1F1ED` com brilho, e "humanity." em **vermelho `#FA3B2B`**, que acende com piscada no instante em que é dita.
- **Tensão:** push-in lento (×1,028 em 3,1 s) até o fade para branco (6,47–6,73 s).

## Como implementar no HyperFrames
Testado em 2026-10-15: composição de rascunho 1080×1920, `npx hyperframes snapshot --at 0.5,1.5,2.3,2.6,2.75,3.1 --describe false`, comparada lado a lado com a referência a 2,45 s (lousa) e 6,3 s (CRT). Lint: 0 erros.

```css
/* testado: snapshot 0,5 s × referência 2,45 s — papel com vinheta, tinta impressa, rack focus */
.lousa { background: radial-gradient(ellipse 75% 60% at 50% 50%, #FCFCFC 55%, #E9E9E9 100%); }
.lousa .fala  { font: 800 81px/1 "Inter"; letter-spacing: -0.02em; color: #3E3D3C; }
.lousa .hero  { font: 900 224px/0.92 "Inter"; letter-spacing: -0.03em; white-space: nowrap; color: #3E3D3C; }
.lousa .hero small { font-size: 0.62em; font-weight: 800; letter-spacing: 0; }   /* o % menor e mais leve */
.impresso { filter: url(#tinta); }   /* borda irregular de tinta: <filter id="tinta"> abaixo */
.desfocado { filter: grayscale(1) blur(15px); }   /* personagem fora de foco na borda */

/* testado: snapshot 1,5 s × referência 6,3 s — monitor CRT em perspectiva */
.crt-cena  { perspective: 1800px; }
.carcaca   { border-radius: 46px; transform: rotateY(-12deg) rotateZ(-2deg);
             background: linear-gradient(160deg, #FFFFFF 0%, #F2F2F0 50%, #D6D6D2 100%); box-shadow: 0 30px 80px rgba(0,0,0,.30); }
.moldura   { border-radius: 60px; background: #111111; box-shadow: inset 0 0 0 6px #2a2a2a; }
.tela-crt  { position: relative; overflow: hidden; border-radius: 48px;
             background: radial-gradient(ellipse 90% 80% at 80% 15%, #8A8A8A 0%, #6E6E6E 45%, #5C5C5C 100%);
             box-shadow: inset 0 0 60px rgba(0,0,0,.85); }
.tela-crt::after  { content: ""; position: absolute; inset: 0; pointer-events: none;   /* scanlines */
                    background: linear-gradient(rgba(0,0,0,0) 50%, rgba(0,0,0,.14) 50%); background-size: 100% 4px; }
.tela-crt::before { content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 2;   /* reflexo do vidro */
                    background: linear-gradient(125deg, rgba(255,255,255,.10) 0%, rgba(255,255,255,0) 38%); }
.crt-texto { font: 800 117px/0.92 "Inter"; letter-spacing: -0.025em; color: #F1F1ED; text-shadow: 0 0 8px rgba(255,255,255,.35); }
.palavra-alerta { color: #FA3B2B; text-shadow: 0 0 10px rgba(250,59,43,.8), 0 0 26px rgba(250,59,43,.45); }
```

```html
<!-- testado: tinta impressa (vai uma vez no body) -->
<svg width="0" height="0" style="position:absolute"><filter id="tinta">
  <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="3"/>
</filter></svg>
```

```js
// testado: snapshots 2,3 · 2,6 · 2,75 · 3,1 s — câmera virtual: um palco com a cena inteira (transform-origin 0 0)
// leva o ponto-alvo do palco ao centro da tela, com borrão de movimento no meio do trajeto
const alvo = { x: 385, y: 970 }, escala = 2.6;                         // centro da lousa no palco
tl.set("#palco", { x: 0, y: 0, scale: 1, filter: "blur(0px)" }, 0);
tl.to("#palco", { x: 540 - alvo.x * escala, y: 960 - alvo.y * escala, scale: escala, duration: 0.6, ease: "power3.inOut" }, 1.0);
tl.to("#palco", { filter: "blur(6px)", duration: 0.3, ease: "power2.in" }, 1.0)
  .to("#palco", { filter: "blur(0px)", duration: 0.3, ease: "power2.out" }, 1.3);
// whip pan para baixo: o mesmo tween levando o alvo seguinte (a tela do terminal, abaixo na foto) ao centro
```

```js
/* proposto, não testado: piscada da palavra-ápice (~0,6 s, 6 trocas) */
tl.set(".palavra-alerta", { color: "#F1F1ED", filter: "blur(0px)" }, 4.7);
[0, .08, .16, .26, .36, .46, .58].forEach((d, i) => tl.set(".palavra-alerta", i % 2 ? { color: "#F1F1ED", filter: "blur(2px)" } : { color: "#FA3B2B", filter: "blur(0px)" }, 4.7 + d));
```

## O que nunca fazer neste estilo
- **Emojis coloridos:** destroem a seriedade documental na hora.
- **Transições de TikTok** (glitch RGB entre cenas, bounce, rotação maluca): o movimento tem que parecer câmera física (pan, tilt, zoom óptico). A única piscada permitida é a da palavra-ápice, curta, uma vez.
- **Corte seco entre as cenas:** a viagem de câmera é o estilo. Cada cena nova é um elemento que já estava visível na anterior.
- **Música pop acelerada:** a força está na voz e no peso das palavras. Se usar trilha, só uma cama tonal grave e minimalista.
- **Várias palavras coloridas:** só o ponto culminante ganha a cor de destaque.

## Adaptações para o vertical (1080×1920)
- A referência é 4:3 horizontal. Todo texto foi para dentro da zona segura (x 110–930, y 470–1430). Por isso o título da abertura sai do topo (y 76–200 na referência) e vai para y 480–700, acima da foto.
- Foto e textos, que na referência dividiam a largura, foram empilhados: título em cima, foto 4:3 de 820 px de largura embaixo.
- Tamanhos convertidos pela proporção do lado menor (1080 → 1080). O "10-20%" daria corpo 256 e não cabe em 820 px sem quebrar a linha (testado). Ficou 224 com `nowrap`.
- O personagem desfocado e a carcaça do monitor podem sair pela borda: são cenário.

## Validação
- Análise medida: `node scripts/analisar-referencia.mjs` (2026-10-15): 0 cortes, 2 trocas por câmera, 3 cenas, push lento, fades, acento na palavra-ápice e tipografia nos quadros com grade, todos conferidos nas folhas.
- CSS e câmera virtual testados em snapshot contra a referência (veja acima).
- **Não validada** num vídeo de aluno (skill `copiar-estilo`, passo 7).
