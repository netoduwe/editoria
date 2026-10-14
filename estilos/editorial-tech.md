---
nome: editorial-tech
descricao: Reels explicativo com cara de conteúdo premium (listas, ferramentas, ofertas, passo a passo); o layout muda conforme a função de cada frase
referencias:
  - { link: "https://www.instagram.com/reel/DeKFBr0vRpv/", autor: "@nick_saraev", analisado_em: 2026-10-14 }
formato: { largura: 1080, altura: 1920, fps: 30 }               # medido
dna:
  - cabeça do apresentador saindo por cima de um painel de câmera arredondado (split)
  - a fala vira título em serifa itálica caixa-alta nas cenas gráficas; sans pesada minúscula no rosto/split
  - um layout por função da frase, com volta à pessoa a cada 1–2 planos
  - revelação cumulativa sincronizada à palavra (números, setas, logos entram quando são ditos)
  - corte seco, quase sem respiro na fala
ritmo:
  plano_medio_s: 2.1            # medido
  plano_faixa_s: [1.47, 3.0]     # medido (p25–p75)
  cortes_por_minuto: 27         # medido
  cortes_nos_3s_iniciais: 2     # medido
  animacoes_por_minuto: 37      # medido
  pausa_maxima_mantida_s: 0.15  # medido (p90)
  max_planos_sem_pessoa: 2      # observado (no gancho chega a 3)
layouts:                          # medido: soma dos planos classificados
  - { nome: split,     pct: 31, funcao: "explicar mantendo o rosto", geometria: "visual y 220–800 · legenda y≈910 · painel y 1240, raio 140" }
  - { nome: rosto,     pct: 21, funcao: "ênfase, consequência, CTA", geometria: "câmera cheia · legenda y≈1350" }
  - { nome: grafico,   pct: 19, funcao: "mecanismo, alerta, diagrama, marca", geometria: "tela cheia · elemento central y 300–1260 · fala-título y≈1460" }
  - { nome: evidencia, pct: 16, funcao: "provar com print/tabela", geometria: "print nítido [140,220,800,1120] sobre cópia ampliada e desfocada" }
  - { nome: card,      pct: 13, funcao: "apresentar item (ordinal + ícone + nome)", geometria: "ordinal y≈470 · card 520×520 raio ~22% · nome y≈1130" }
legenda:
  fonte: { familia: "Inter", peso: 800, arquivo: "fontes/inter-800.woff2", original_parecida_com: "SF Pro Display Bold" }  # observado
  tamanho_px: 90                # estimado: haste de 70 px ÷ 0,73 (split) e maiúsculas de ~65 px (rosto)
  caixa: normal                 # observado
  espacamento_em: -0.03         # estimado
  palavras_por_vez: "1-2"       # observado (legendas_16.5–20.5 s)
  troca: substitui              # observado; no gancho acumula ("don't" → "don't use")
  sincronia: "no início da palavra"  # observado ("security" aparece com security@19.04)
  cor: { fundo_escuro: "#FFFFFF", fundo_claro: "#111111" }  # observado
  contorno: nenhum
  sombra: "só no rosto: 0 3px 12px rgba(0,0,0,.45)"          # observado
  fundo: nenhum
  posicao_y: { rosto: 1350, split: 910, grafico: 1460 }      # estimado na grade
  entrada: "troca seca, sem animação"                        # observado
  destaque: { metodo: "palavra de ênfase em serifa itálica + brilho na cor de destaque", cor: destaque_1, frequencia: "1–2 por vídeo" }  # observado
titulos:
  fonte: { familia: "Instrument Serif", estilo: italico, arquivo: "fontes/instrument-serif-italic.woff2" }  # observado (serifa itálica condensada de alto contraste)
  tamanho_px: [104, 124]        # estimado
  caixa: alta
  uso: "ordinais (THE SECOND…), nomes nos cards e a própria fala em cenas gráficas/evidência"
  efeito: "degradê vertical suave para transparente na parte de baixo"   # observado
cores:
  fundo_claro:   { referencia: "#FFFFFF", usar: marca.fundo_claro }     # medido
  fundo_creme:   { referencia: "#E3D9C9", usar: "marca.fundo_claro (versão quente)" }  # medido — só na promessa do gancho
  fundo_escuro:  { referencia: "#262A34", usar: marca.fundo_escuro }    # medido — carvão azulado no hook
  preto:         { referencia: "#000000", usar: "preto (cenas de alerta/segurança)" }  # medido
  destaque_1:    { referencia: "#DA7450", usar: marca.destaque }        # medido (coral: ordinais, números, brilho do CTA)
  destaque_2:    { referencia: "#3AB6BA", usar: marca.destaque_2 }      # medido (turquesa: ícone/marcador)
  imagem: "clara (50% dos quadros), contraste alto, saturação muito baixa, temperatura neutra"  # medido
movimento:
  entrada_padrao: { duracao_s: 0.3, ease: "power3.out", deslocamento_px: 24, opacidade: "0→1" }  # observado (fade em 3 quadros de 0,1 s)
  cascata_s: 0.1                # observado (números 1–5 do gancho)
  camera: "estável; push lento no rosto"   # medido (movimento de base baixo)
  punch_in: { escala: 1.0, quando: "não usa punch-in; muda de layout" }   # observado
  transicoes: { corte_seco_pct: 90, outras: ["fade de 0,3 s ao entrar em card claro"] }  # observado
  logo_vira_historico: "logo ativo encolhe para ~30% e desce; o próximo assume o foco em 8–12 quadros"  # observado
audio:
  loudness_lufs: -14            # medido (-14,3)
  trilha: { usar: "?", abaixo_da_voz_db: null, clima: "inconclusivo pelo analisador — ouvir" }
  sfx: { nos_cortes_pct: 10, tipos: ["pop leve na entrada de card/ícone"] }  # medido (2 de 21 cortes) + proposto
gancho: "quadro 0 já em split com o rosto e a legenda; o logo do assunto se forma letra a letra (0–0,9 s); em ~1,1 s corte para card da promessa: título serifado palavra a palavra + números em cascata + quantidade em destaque"  # observado
final: "rosto com CTA: verbo em serifa itálica + palavra-chave em sans com brilho na cor de destaque; sem card final"  # observado
---

# Estilo editorial-tech

## DNA
Uma explicação que parece revista: espaço em branco, poucas cores, serifa itálica para o que importa e sans pesada para a fala. O apresentador nunca some por muito tempo: a cabeça dele invade a área gráfica pelo painel arredondado. Tudo o que é dito ganha forma na tela no instante em que é dito.

## Gramática (como decidir)
- Cada frase escolhe o layout pela **função**: identificar → `card`; provar → `evidencia`; explicar mantendo o rosto → `split`; demonstrar mecanismo → `grafico`; enfatizar/concluir/CTA → `rosto`.
- No corpo, no máximo 2 planos seguidos sem a pessoa. O gancho pode ter 3.
- Item de lista = `card` curto (0,8–1,1 s) com ordinal ("O PRIMEIRO", "A SEGUNDA") → depois prova/explicação.
- Dentro de um mesmo plano, novos elementos entram na palavra que os nomeia e os anteriores ficam (logos anteriores encolhem e viram histórico).

## Layouts
**split** — fundo liso (claro na maior parte; escuro no gancho); visual principal na área `[100,220,880,580]`; legenda centrada em y≈910; painel da câmera `[0,1240,1080,680]`, raio superior 140, cabeça recortada passando por cima. Receita testada (`npx hyperframes remove-background corte.mp4 -o pessoa.webm`, ~15 s de processamento por segundo de vídeo na CPU):
```css
.painel{position:absolute;left:0;top:1240px;width:1080px;height:680px;border-radius:140px 140px 0 0;overflow:hidden}
.painel video{position:absolute;left:0;top:-540px;width:1080px;height:1920px;object-fit:cover}  /* 1240 - 540 = 700 */
.cabeca{position:absolute;left:0;top:0;width:1080px;height:1240px;overflow:hidden}
.cabeca video{position:absolute;left:0;top:700px;width:1080px;height:1920px;object-fit:cover} /* mesmo 700 */
```
`corte.mp4` no painel e `pessoa.webm` na cabeça, ambos `muted` e com o mesmo tempo; a voz vem de um `<audio>` separado. Ajuste o 700 para o topo do cabelo ficar em y≈990 (120–250 px acima do painel).

**rosto** — câmera cheia, push lento 1,10→1,15 por plano; legenda branca com sombra curta em y≈1350.

**card** — fundo claro (ou creme na promessa); ordinal em serifa itálica caixa-alta na cor de destaque com degradê para transparente (y≈470); card/ícone 520×520 com cantos ~22% e sombra suave; nome em serifa itálica caixa-alta cinza escuro (y≈1130). Entra com fade/subida em 0,3 s.

**evidencia** — print nítido no centro, recortado na informação que importa, sobre uma cópia do mesmo print ampliada e desfocada (blur 20–30 px) ocupando a tela; a fala aparece como título serifado em caixa-alta (y≈1460).

**grafico** — tela cheia (branco, ou preto em alerta/risco); um elemento central grande (logo, diagrama, mockup com alerta); fala como título serifado; diagramas montam nó a nó na ordem falada.

## Legenda e tipografia
- Rosto e split: Inter 800, ~90 px, caixa normal, 1–2 palavras que **substituem** a anterior no início de cada palavra falada; branco no escuro, quase preto no claro; sem caixa e sem contorno.
- Cenas gráficas, cards e evidência: a fala vira **título** em Instrument Serif Italic caixa-alta, 2 palavras por vez.
- Ênfase rara (1–2 por vídeo): mistura serifa itálica + sans com brilho suave na cor de destaque (ex.: "re-explain / a single", CTA "comment 'Claude'").
- Rótulos pequenos (ex.: alerta): Inter 800 caixa-alta, 30–34 px, branco + destaque.

## Movimento
- Entrada padrão: opacidade 0→1 + subir 24 px em 0,3 s (`power3.out`); cascatas de 0,1 s.
- Logo ativo → histórico: encolhe para ~30% e desce enquanto o próximo entra grande (8–12 quadros).
- Troca de layout é corte seco; fade só ao entrar em card claro.
- ~37 animações por minuto: algo novo entra a cada ~1,6 s, mesmo sem corte.

## Áudio
Voz nivelada (−14 LUFS, LRA baixo), corte seco entre frases (respiro máximo ~0,15 s). SFX discretos e raros (pop na entrada de card/ícone, ~1 a cada 10 trocas). Trilha: inconclusivo na análise; se o aluno quiser, trilha discreta 20–24 dB abaixo da voz.

## Gancho e final
- Gancho: quadro 0 em split com rosto + legenda; o nome/assunto se forma na área gráfica; corte em ~1 s para o card da promessa, com título montando palavra a palavra e a **quantidade** destacada ("5 FERRAMENTAS GRÁTIS"). Fórmula: proibição/condição ("não use X até…") + número + benefício.
- Final: rosto, CTA curto com verbo em serifa itálica + palavra-chave em sans com brilho na cor de destaque.

## Nunca
Pills de karaokê, legenda com contorno grosso, transição chamativa (whip, glitch), mais de 2 cores de destaque, tela parada > 2 s sem algo entrar, gráfico com dado inventado.

## Adaptações para a marca do aluno
Fundos e destaques seguem `marca/design.md` (os hex da referência indicam o **papel**). Gravação noturna/escura → split em fundo escuro da marca em vez de branco (registrar). Sem prints reais → trocar `evidencia` por `grafico` com o dado falado.

## Validação
- 2026-10-14: análise medida da referência (os números deste arquivo). Um teste feito com a versão anterior desta receita ficou em **6/18** na comparação: ritmo mais lento (plano médio 4,7 s × 2,1 s; 13 × 37 animações/min) e respiros maiores (pausa p90 0,35 s × 0,15 s). Esta versão fixa os alvos de ritmo; ainda **não validada** com um teste novo — rode a etapa "Provar" da skill `copiar-estilo` no seu primeiro vídeo.
