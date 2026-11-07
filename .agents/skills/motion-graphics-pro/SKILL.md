---
name: motion-graphics-pro
description: Cria motion graphics de nível profissional (Reels/Stories/anúncios verticais, showreels, vinhetas, kinetic typography) construídos 100% em componentes animáveis com HTML/CSS 3D + GSAP, renderizados quadro a quadro com Playwright + ffmpeg, com motion blur real, trilha e SFX sincronizados e auditoria automática de zona segura. Use quando o usuário pedir "motion", "motion graphic", "animação de texto", "vídeo animado", "reels animado", "vinheta", "showreel", "kinetic type", ou entregar storyboards/referências para virar vídeo.
---

# Motion Graphics Pro

Receita de motion graphics do Editor IA. Siga a ordem: **direção → construção → revisão → render**. Nunca entregue sem revisar quadros.

**Uso no kit dos alunos:** leia `marca/design.md` e use a identidade do aluno. Trabalhe em `projetos/<nome>/`, preserve os originais e entregue o MP4 em `saida/`. Esta skill usa seu renderer Playwright/FFmpeg; a skill `motion-design` continua disponível para o fluxo HyperFrames. Para esta receita, não misture os dois contratos de render.

Antes de construir, apresente roteiro e storyboard e espere a aprovação do aluno. Referências fornecidas pelo aluno servem para estudo, sem reutilizar seus assets. Este pacote não inclui a biblioteca pessoal, vídeos de terceiros nem o Motion Video Director.

## 0. Regras de ouro (o que separa amador de profissional)

1. **Nada de imagem estática animada.** Storyboards e PNGs são *referência*. Tudo que aparece na tela é componente: texto real, placas com espessura (camadas `translateZ`), ícones em CSS/SVG, números em odômetro, botões. Cada parte anima sozinha.
2. **Uma ação dominante por vez.** O olho segue um foco. O resto fica estável, esmaecido ou desfocado (profundidade de campo).
3. **Toda transição é motivada** por um objeto ou movimento: fita metálica que varre a lente, borda da placa que vira o próximo quadro, câmera que atravessa o anel do infinito, giro do card que revela a próxima face.
4. **Semântica no movimento.** Anime o significado: "nunca mais comprar" → risco em COMPRAR; "atualizado" → barra de progresso; "pular de curso em curso" → bolinha que pula de palavra em palavra e vira o ponto final; "até 2028" → folhas arrancadas até 2028.
5. **Sem repetição de copy.** Cada palavra aparece uma vez, na hora certa. Marquees e loops de texto repetido parecem enchimento.
6. **Zona segura é inegociável** (Feed + Reels 1080×1920): texto e objetos-chave em **x 110–930, y 470–1430**. Nada de HUD, timecode ou rótulos nas bordas.
7. **Ritmo de música.** Escolha o BPM (ex.: 114) e posicione cortes, impactos e entradas no grid de batidas: `at(b) = b*60/BPM`.
8. **Composição centrada.** Cada bloco de leitura (título + objeto) fica centrado verticalmente em torno de y≈900, não colado no topo da zona segura.
9. **Primeiro quadro conta.** Nada de tela preta: o quadro 0 já tem luz/forma (vira capa e é o hook).
10. **Áudio discreto.** SFX apoiam o movimento ~10–15 dB abaixo da música/locução; um efeito por grupo de eventos, não um por elemento.

## Mapa da skill
- `references/briefing-e-direcao.md` — perguntas de briefing, roteiro em beats, sistema visual, ritmo.
- `references/formatos-e-zonas-seguras.md` — Reels/TikTok/Shorts/Ads/feed/16:9, tamanhos mínimos, exportação, loudness.
- `references/acessibilidade-e-qa.md` — flashes, contraste, legendas, ortografia, checklist técnico, iteração.
- `references/solucao-de-problemas.md` — bugs reais e correções.
- `templates/index.html` — esqueleto determinístico pronto (cena, cue, câmera, zona segura). `templates/gsap.min.js`, `templates/fonts.css`.
- `scripts/render.mjs` (stills/cues/audit/render), `scripts/audio.py` (trilha+SFX), `scripts/contact_sheet.py` (folha com guias).
- Ponto de partida incluído: `templates/index.html`. Os exemplos pessoais do autor não fazem parte do kit.

## Setup de um projeto novo
Na raiz do kit, execute `node scripts/criar-motion-pro.mjs <nome>`. O comando cria `projetos/<nome>/` com template, fontes locais, GSAP e ferramentas. Não substitui projetos existentes.

Dentro do projeto criado:
```text
npm install
npx playwright install chromium
python -m pip install numpy scipy Pillow
node render.mjs --stills 0,0.5,1,2
node render.mjs --cues
python audio.py
node render.mjs out/video.mp4 30
```
No macOS/Linux, use `python3` se necessário. FFmpeg precisa estar no PATH. A instalação do Python é necessária para áudio e folha de revisão; o render usa Node e Playwright. Copie as cores e fontes de `marca/design.md` para a composição. O template inclui Inter com sua licença OFL; outras fontes exigem arquivos locais e licença correspondente.

Para gerar a folha: dentro de `out/`, execute `python ../contact_sheet.py folha.jpg 0,0.5,1,2`. Os tempos devem ser os mesmos dos stills. O render gera vídeo sem áudio; finalize com o comando de mixagem da seção 5.

## 1. Direção (antes de codar)
Leia `references/briefing-e-direcao.md`. Se faltar copy exata, destino ou duração, pergunte antes.

- Leia o brief e as referências. Defina **paleta em tokens** (ex.: fundo navy, marfim, ciano, metal escovado), **tipografia** (display condensada com extrusão + serifa itálica de ênfase + apoio com tracking largo) e **materiais**.
- Escreva o roteiro por cena com tempos em batidas e três estados por cena: **entrada → leitura → saída/transição**.
- Hook nos primeiros 0,5 s: a primeira palavra legível aparece antes de 0,6 s.
- Tempo de leitura: ≥ 0,25 s por palavra em foco; frase final completa visível ≥ 0,8 s; CTA final com hold ≥ 1 s.

## 2. Construção

Estrutura recomendada (ver `templates/index.html` como ponto de partida):

- **Determinismo:** uma `gsap.timeline({paused:true})` e `window.renderAt(t)` que faz `tl.seek(t)` e calcula o que é por quadro (poeira, cometa, câmera). Proibido `Math.random`, `Date.now`, CSS transitions/animations. Ruído = função hash.
- **Fontes antes de medir:** `await document.fonts.load(...)`, depois montar layout e timeline, depois `window.__ready = true` (o renderer espera essa flag).
- **Medir tinta, não caixa:** use `canvas.measureText` (`actualBoundingBox*`, `fontBoundingBox*`) para centrar câmera e encaixar textos; a caixa de linha mente (Anton/Playfair têm ascendentes enormes).
- **Câmera como proxy:** tween de um objeto `CAM={fy,z,rx,rz,dof}` e aplique no `renderAt` (ex.: cartaz tipográfico que a câmera percorre, zoom calculado `z=min(1.5, 820/largura)` para nunca sair da zona segura; recuo final revela a frase inteira).
- **Câmera global:** pulso leve por batida (+1% escala), tremor e aberração cromática só nos impactos (decai em 0,45 s).
- **Centralização:** ou `left:50%`+`xPercent:-50`, ou `margin-left:-w/2`. **Nunca os dois** (bug real: placa deslocada 430 px para a esquerda).
- **Saídas de verdade:** elemento que sai deve terminar fora da tela **e** com `opacity:0`. Elemento que entra de fora da tela fica `opacity:0` até começar a entrar (`tl.set(el,{opacity:0},0); tl.set(el,{opacity:1},tEntrada)`).
- **3D:** `perspective` na cena; objetos com espessura = N camadas `translateZ(-3px*i)`. Filtros/opacity < 1 achatam 3D — aplique-os em elementos sem filhos 3D.

- **Sem quadro vazio em transições:** a entrada da cena seguinte começa 0,05–0,1 s *antes* do corte (sob a fita/azul), e cenas podem se sobrepor (mostre a próxima cena ~0,15 s antes enquanto a anterior sai).
- **Traços SVG desenháveis** (`stroke-dashoffset`) com `stroke-linecap:round` mostram uma bolinha antes de começar: deixe `opacity:0` até o início do desenho.
- **Rotação de partes de SVG** (alça de cadeado, ponteiros): use `svgOrigin:'x y'` em coordenadas do viewBox — `transformOrigin` em px é relativo à caixa do elemento e joga a peça para fora.
- **Rolagem de câmera entre blocos** (container com `y:-1000`): o bloco anterior precisa sumir (`opacity:0`) além de subir, senão sobra na borda.
- **`letterSpacing` em tweens:** use px, não em (GSAP pode converter em errado).
- **Demonstração de produto/IA (chat):** sem caixa de fundo pesada; campo de digitação com caracteres aparecendo, zoom de câmera no campo enquanto digita (esconda o cabeçalho para não cobrir o título), recuo ao enviar, "digitando…", resposta palavra a palavra e checklist que se marca.

### Vocabulário de movimento que funciona
- Easing: entradas `expo.out`/`back.out(1.6–2.6)`, câmera `expo.inOut`, saídas `power3.in`/`expo.in`. Nada linear em elementos de leitura.
- Texto: palavras sobem por máscara (`.mask{overflow:hidden}` + `yPercent:115→0`, stagger .06–.08); letras com `scaleY`, blur→0, stagger `from:'center'`; itálicos "escritos à mão" com `mask-image` em gradiente animado (`--p` 0%→116%); tracking que fecha (1em→.45em).
- Brilho: **uma** passada de luz por objeto (sheen/sweep), nunca pulsando durante a leitura.
- Impacto: slam com escala 2.6→1 + flash curto (≤ .45) + tremor + SFX impact no mesmo frame.
- Números: odômetro (coluna de dígitos em `overflow:hidden`, `yPercent` até o alvo).
- Squash & stretch em quiques (scaleY .8 / scaleX 1.12 no pouso).

## 3. Revisão (obrigatória, iterativa)

Execute dentro do projeto criado, depois de instalar as dependências:
```text
node render.mjs --stills 0,0.5,1,2
node render.mjs --audit 0.1
```
Para a folha com guias, entre em `out/` e execute `python ../contact_sheet.py folha.jpg 0,0.5,1,2`.

- Marque objetos-chave sem texto com `data-safe` para entrarem na auditoria.
- O que pode sobrar no `--audit`: entradas/saídas < 0,2 s. Qualquer intervalo maior é bug (ex.: palavra "saiu" mas ficou parada na borda).
- Revise **sequências** (4–8 quadros espaçados 0,1 s) em cada transição para achar sobreposição, tremedeira, texto cortado, flash excessivo.
- Confira legibilidade em escala de celular (folha a 270 px de largura).

## 4. Áudio
- Normalize a mixagem final: `ffmpeg -i out/trilha.wav -af loudnorm=I=-14:TP=-1:LRA=11 out/trilha_norm.wav`.
- SFX: alinhe o **pico** do som ao quadro do evento (whoosh termina no corte; impact começa no impacto).

- Cada evento visual chama `cue(t,'tipo',ganho)`; `node render.mjs --cues` exporta `out/cues.json`; `python3 audio.py` sintetiza trilha (pad, baixo, arpejo, bateria no BPM) + SFX (whoosh, impact, tick, swish, shine, paper, flip, pop, click, odo, ding, riser) posicionados pelos cues.
- Se houver música/locução real, use-as e ajuste os tempos ao grid delas.

- **Nível dos SFX:** impactos = thump grave curto (sem estalo de ruído branco), whooshes filtrados e curtos; ganhos baixos (ver `scripts/audio.py`). Sem saturação (`tanh`) no master: ganho fixo e depois `loudnorm`/ganho calculado.
- **Versão sem música:** `python3 audio.py --sem-musica` gera só os SFX. Aplique **o mesmo ganho** da mixagem com música (meça a loudness da trilha e use o mesmo `volume=`), em vez de normalizar o arquivo de SFX sozinho — senão os efeitos ficam altos demais.
- Nunca deixe eventos de áudio "fixos" herdados de outro projeto (risers em batidas que não batem com as cenas): todo som vem de um `cue()` da timeline atual.

## 5. Render final

```text
node render.mjs out/raw60.mp4 60
ffmpeg -i out/raw60.mp4 -i out/trilha.wav -vf "tmix=frames=2,fps=30,noise=alls=4:allf=t" -af loudnorm=I=-14:TP=-1:LRA=11 -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart out/final.mp4
```
`tmix` de 2 quadros a 60→30 fps = motion blur real; `noise` = grão de filme. Rode o render em background com marcador de fim no log; ~20 min para 30 s.

## 6. Checklist de entrega
- [ ] Copy exata do cliente, sem palavra repetida, ortografia conferida
- [ ] `--audit` limpo (só transições < 0,2 s)
- [ ] Sem HUD/elementos nas bordas; nada parado fora de cena
- [ ] Hook < 0,6 s; holds de leitura respeitados; CTA final ≥ 1 s
- [ ] Impactos com flash+tremor+SFX no mesmo frame; uma passada de brilho por objeto
- [ ] Vídeo 1080×1920, 30 fps, com áudio; MP4 fora do git (`out/` no `.gitignore`)
- [ ] Flashes ≤ 3/s, contraste ≥ 4.5:1, entendível sem som (ver `references/acessibilidade-e-qa.md`)
- [ ] Áudio −14 LUFS / −1 dBTP (`loudnorm`); música/fontes com licença de uso
- [ ] Formatos extras pedidos (4:5, 1:1, 16:9, clean, capa) com zona segura de cada destino
- [ ] Quadro 0 com conteúdo; blocos centrados; transições sem quadro vazio nem bolinhas de traço
- [ ] Entregar com e sem música quando houver locução a gravar
- [ ] Resposta ao usuário: o que mudou, onde está o código, como re-renderizar
