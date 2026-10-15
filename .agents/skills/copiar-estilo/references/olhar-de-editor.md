# Olhar de editor — o que extrair e como medir

Para cada item: **onde olhar** → **como medir** → **o que escrever na receita**. Anote a fonte (medido / observado / estimado / proposto) e o arquivo + tempo da evidência.

## Conversões (quadro 1080×1920)
- Grade do `quadro.mjs --grade`: linhas finas a cada 108 px (horizontal) e 192 px (vertical); grossas no centro (540, 960).
- **Tamanho da fonte ≈ altura das maiúsculas ÷ 0,72** (sans como Inter/Montserrat; serifas ≈ ÷ 0,66). Meça a altura de uma letra maiúscula (H, E, T) no recorte ampliado: px no recorte ÷ 2 = px reais.
- Posição da legenda = centro vertical da linha de texto (y). Registre por layout: rosto, split, gráfico.
- Referência em outra resolução: multiplique x por 1080/largura e y por 1920/altura. Referência 16:9 → para vertical, mantenha proporções relativas (tamanho do texto ÷ **lado menor** do quadro, que é o que o `analise.md` chama de "em 1080") e siga a adaptação horizontal → vertical do SKILL.md.
- Classes de texto pela altura das maiúsculas ÷ lado menor: **hero/estatística ≥ 12%**, **título 6–12%**, **legenda/fala 3–6%**, rótulo < 3%. `quadro.mjs --texto` mede isso em qualquer instante.
- Duração de animação = nº de quadros da entrada (em `--seq`) × 33,3 ms (a 30 qps).

## 1. Gancho (0–3 s) — `gancho_0-3s_10qps.jpg`, transcrição
- Quadro 0: rosto? texto? movimento? (não pode haver tela vazia ou logo lento)
- Tempo até o primeiro texto na tela e até a primeira mudança visual.
- Nº de mudanças até 3 s (medido: `cortes_nos_3s_iniciais` + picos).
- Fórmula verbal: proibição ("não faça…"), pergunta, número ("5 ferramentas…"), resultado, curiosidade. Copie a **fórmula**, nunca a frase.
- Revelação em etapas? (título monta palavra por palavra, número cresce, lista aparece)

## 2. Ritmo e corte — analise.json `ritmo`, `audio.fala`
- Plano médio, mediana, faixa (medido). Cortes/min (medido).
- Silêncio: pausas p90 e pausas/min (medido) → `pausa_maxima_mantida_s`.
- Jump cut disfarçado? Compare o tamanho do rosto antes/depois em `cortes_*.jpg`: se muda, há **punch-in** alternado — estime a escala (largura do rosto depois ÷ antes).
- Ritmo por trecho: o gancho corta mais rápido que o corpo? o final desacelera?

## 3. Layouts — `planos_*.jpg` + tabela `planos`
Classifique cada plano e some o tempo:
| Layout | Sinais |
|---|---|
| rosto cheio | câmera ocupa o quadro |
| split | visual em cima, câmera embaixo (ou o contrário); cabeça invade o painel? cantos arredondados? raio estimado |
| card/identificador | fundo liso, ícone/logo central, rótulo + nome |
| evidência | print/tela ampliado, fundo = cópia desfocada ou cor |
| gráfico/diagrama | elementos desenhados, setas, números |
| b-roll | imagem de apoio sem o apresentador |
| texto cheio | frase grande ocupando a tela |
Registre: % do tempo, função (para quê é usado), geometria (retângulos em px), fundo (hex), e a **regra de alternância** (ex.: nunca 2 planos seguidos sem rosto; volta ao rosto nas ênfases).

## 4. Legenda — `legendas_*.jpg` (10 qps) + palavras do analise.md + `quadro.mjs`
- Palavras por vez (conte em cada troca) e se acumula ou substitui.
- Sincronia: o quadro em que a palavra aparece × o tempo dela na transcrição (adiantada, junto, atrasada — em quadros).
- Fonte (família/classe e peso), caixa (alta/normal), espaçamento entre letras (apertado/normal), entrelinha, máx. de linhas.
- Cor do texto, contorno (px), sombra (sim/não, dura/suave), fundo (pílula/caixa/nada) — `--cor` e `--recorte`.
- Destaque: como a palavra-chave se diferencia (cor, tamanho, fundo, sublinhado, peso) e com que frequência.
- Posição y por layout; largura máxima (margens).
- Animação de entrada/saída: pop (escala), sobe, fade, máquina de escrever, karaokê — e duração (`--seq`).
- Emoji? Palavrão censurado? Pontuação mantida?

## 5. Tipografia além da legenda — títulos, rótulos, números
- Hierarquia: quantas famílias (geralmente 1 sans + 1 serifa ou 1 display). Onde cada uma aparece.
- Tamanhos relativos (título ÷ legenda), caixa, itálico, cor.
- Identifique a família pela anatomia (veja `fontes-equivalentes.md`) e registre a equivalente livre.

## 6. Cor e imagem — analise.json `cor` + `quadro.mjs --cor`
- Tratamento da câmera: brilho, contraste, saturação, temperatura (medido). Vinheta? granulação? desfoque de fundo?
- Fundos dos gráficos: hex de cada (medido com `--cor`).
- Destaques: `destaques_saturados` (medido) → confirme em qual elemento cada um aparece; descarte pele/roupa.
- Papéis: fundo claro, fundo escuro, texto claro, texto escuro, destaque 1, destaque 2.

## 7. Motion e transições — `cortes_*.jpg`, `picos_*.jpg`, tabela "Câmera", `quadro.mjs --seq`
- Para 3–5 entradas típicas: o que se move (y, escala, opacidade, máscara), quanto (px, %), quanto tempo (quadros), ease (rápido no início e assenta = power out; passa do ponto e volta = back/spring; constante = linear).
- Elementos se acumulam (os anteriores ficam) ou se substituem?
- Movimento contínuo de câmera (push lento, Ken Burns) em quais layouts; velocidade (medida por cena: "push-in lento, escala ×1,028 em 3,1 s").
- Transições entre planos: % corte seco × outras; duração das outras. Trocas **sem corte** (whip, mergulho, fade) estão na tabela "Câmera" com duração, escala e para onde a câmera vai.
- Picos/min (medido) = densidade de animação. Cada pico vem com o tipo que o script deduziu (câmera, fade, entrada de elemento): confira em `picos_*.jpg`.

## 7b. Estilos documentais e motion investigativo
Vídeos tipo Vox, Bloomberg Originals, Johnny Harris: poucos ou nenhum corte, a força está na câmera e na encenação. Procure:
- **Transições sem corte** — a câmera viaja entre elementos do cenário? (`transicao_tipo: camera_continua`, tabela "Câmera", `picos_*.jpg`). Registre a ordem da viagem (foto → lousa → monitor), o tipo de cada trecho (whip pan, whip-zoom, mergulho), a duração com aceleração e frenagem e se há desfoque de movimento. Na receita, a câmera é **contínua**: reproduza com uma câmera virtual (um palco grande que escala e desloca), nunca com corte seco.
- **Profundidade de campo** — há desfoque intencional em elementos secundários (*rack focus*)? Compare nitidez do texto/objeto em foco com a do personagem ou fundo no quadro com grade. Estime o desfoque pela largura da borda borrada (px no quadro ÷ escala para 1080) e registre o CSS (`filter: blur(15px)` no plano de trás) e quando o foco muda.
- **Ancoragem diegética** — o texto é exibido em elementos do próprio cenário (tela, lousa, ficha, papel, outdoor)? Registre a superfície, a perspectiva (giro/inclinação), a textura que o texto herda (scanlines e reflexo de vidro de CRT, giz, impressão, papel) e o brilho (fósforo, neon). Isso entra como CSS testado na receita.
- **Acentos de cor** — o estilo usa uma cor rara como alarme ou gatilho de retenção? (`alerta_estilo`, seção "Acentos de cor no tempo": instante, cor, posição e a palavra falada). Registre a regra (só a palavra-ápice, uma vez por vídeo), o brilho/glow e como a cor entra (corte seco, fade, **piscada/glitch** curta: o script conta as trocas no 1º segundo).
- **Material de arquivo** — foto histórica, documento, recorte de jornal? Tratamento (P&B, grão, borda, sombra, vinheta) e se a foto se **monta em camadas** no início (objetos aparecendo um a um).
- **Entrada e saída** — fade a partir de tela branca/preta no início, fade para branco/preto no fim (tabela "Câmera").

## 8. Áudio — analise.json `audio` + ouvido do aluno
- Loudness (medido). Trilha: nível relativo (medido ou inconclusivo) + clima (o aluno ouve).
- SFX: `cortes_com_batida_sonora` (medido) e `batidas_fora_da_fala` (candidatos). Tipos: whoosh na troca, pop em texto, clique em UI, ding em número — confirme com o aluno.
- Voz: comprimida/próxima? (LRA baixo ≈ voz muito nivelada)

## 9. Final — últimos 3 s em `segundos_*.jpg`
- Termina em loop (último quadro casa com o primeiro)? CTA falado, card de CTA, logo? Duração do final.

## 10. Erros comuns ao copiar
- Copiar o **conteúdo** como se fosse estilo (o tema, a lista de 5, o mascote do criador).
- Confiar na primeira impressão: confira fps, tempos e tamanhos medindo; rótulos de folha vêm do nome do arquivo, não da ordem que você supôs.
- Achar que todo corte é corte seco sem olhar a sequência de 6 quadros.
- Achar que "0 cortes" é câmera parada: confira `transicao_tipo` e `picos_*.jpg`; trocas por câmera não são cortes.
- Descartar uma cor por ser 0,2% da imagem: num vídeo monocromático, é a cor mais importante (veja `alerta_estilo`).
- Escrever a receita sem abrir as folhas: o JSON não mostra layout, textura, desfoque nem o que está escrito.
- Dar a mesma importância a tudo: o que define o estilo costuma ser 3–5 traços (ex.: cabeça sobre painel + serifa itálica + revelação cumulativa). Diga quais são na receita.
