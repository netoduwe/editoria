---
name: copiar-estilo
description: Aprende o estilo de edição de um vídeo de referência (link do YouTube, Shorts, Instagram, TikTok ou arquivo) e o transforma numa receita reutilizável em estilos/<nome>.md — baixa, mede ritmo/cor/áudio, olha quadro a quadro, extrai tipografia, layouts, motion e gancho, e prova a cópia reproduzindo num vídeo do aluno e comparando. Use quando o aluno disser "copia esse estilo", "quero editar igual a esse vídeo", "faz no estilo desse criador", mandar um link de referência ou colar um pedido "copia o estilo da referência … da biblioteca".
---

# Copiar estilo de edição (referência → receita → prova)

O objetivo não é "parecido": é uma receita com números que reproduz a **linguagem** da edição em qualquer vídeo do aluno, com a **identidade** do aluno. Cada parâmetro da receita precisa de uma fonte: **medido** (script), **observado** (quadro + tempo), **estimado** (medida aproximada na grade) ou **proposto** (lacuna preenchida por você). Nunca escreva "medido" sem medição.

Trabalhe em `referencias/estilos/<nome>/` (bastidores, fora do Git) e entregue `estilos/<nome>.md`.

## 1. Combinar o pedido (uma mensagem, só se faltar)
- 1 a 3 links. **Recomende 2–3 vídeos do mesmo criador/formato**: estilo é o que se repete; o que aparece em um só vídeo é conteúdo.
- Nome do estilo (padrão: `<perfil>-<formato>`, ex.: `nick-reels`).
- Foco, se o aluno quiser só uma parte: legenda, ritmo/cortes, motion/gráficos, cor, áudio. Padrão: tudo.

## 2. Baixar
Referência da biblioteca (pedido com ID): se o item já tem `estilo`, a receita existe — pule para a skill `editar-video` com ela. Senão, pegue o link com `node scripts/biblioteca.mjs listar --json` (`video_url` = Drive, funciona no script abaixo; `link_original` = post do criador).
```bash
node scripts/baixar-referencia.mjs "<link>" <nome>          # um por vídeo; nomes <nome>, <nome>-2, <nome>-3
```
Instagram/TikTok pedindo login → `--cookies-de firefox` **só com autorização do aluno** (dá acesso à conta dele; nunca mostre nem copie o conteúdo dos cookies). Plano B: o aluno salva o vídeo ou grava a tela, arrasta para `referencias/` e você roda o mesmo script com o caminho do arquivo. Em gravação de tela, ignore a interface do app (curtidas, legenda do post, barra).

## 3. Medir
```bash
node scripts/analisar-referencia.mjs referencias/estilos/<nome>/video.mp4 [--idioma pt]
```
Leia `analise/analise.md`: ritmo (cortes/min, plano médio, cortes no gancho), movimento (picos de animação/zoom), cor (brilho, contraste, saturação, temperatura, paleta, **destaques saturados**), áudio (loudness, pausas, trilha, batidas sonoras nos cortes), fala (ppm). Esses números já são **medidos**. Se a trilha der "inconclusivo", peça ao aluno para ouvir e dizer: tem música? que clima? tem whoosh/pop nas trocas? (você não ouve áudio).

O script também mede o que corte nenhum mostra:
- **Trocas de cena sem corte** (`transicao_tipo`, tabela "Câmera"): whip pan, whip-zoom, mergulho (zoom forte para dentro de uma região), push/pan lento por cena e fades. "0 cortes" com `camera_continua` = a câmera viaja entre as cenas; nunca escreva "câmera fixa" nesse caso.
- **Alertas de estilo** (`alerta_estilo`): o que define o estilo e o número sozinho esconderia, como uma cor que só acende na palavra-ápice (com o tempo da palavra), um mergulho ou um fade. Cada alerta vira um traço do `dna` ou uma regra, depois de confirmado nas folhas.
- **Texto na tela** (estimado, sem OCR): nos quadros com grade de `folhas/picos/`, a altura das maiúsculas, a classe (hero/estatística, título, legenda, rótulo), o peso aparente, a cor e a posição de cada linha. Para medir outro instante: `node scripts/quadro.mjs <video> <t> --grade --texto`.

## 4. Olhar como editor (nesta ordem)
**Nunca escreva a receita só com o `analise.json` ou o `analise.md`.** É obrigatório abrir e inspecionar visualmente, com a ferramenta de ler arquivos (que mostra imagens), as folhas `gancho_0-3s_10qps.jpg`, `segundos_*.jpg`, `picos_*.jpg` e os quadros com grade de `folhas/picos/` **antes** de redigir `estilos/<nome>.md`. Os números não mostram layout, textura, profundidade de campo, superfície onde o texto mora nem o que está escrito. Na referência que motivou esta regra, o script viu "0 cortes, câmera fixa", e as folhas mostravam 3 cenas ligadas por mergulhos de câmera, rack focus e o clímax dentro de um monitor CRT. Anote em `evidencias.md` cada folha aberta e o que ela mostrou.

Leia [references/olhar-de-editor.md](references/olhar-de-editor.md) e siga o checklist. Abra as folhas em `analise/folhas/`:
1. `gancho_0-3s_10qps.jpg` — o que existe no quadro 0, quando entra o primeiro texto, quantas mudanças até 3 s, qual a promessa.
2. `cenas_*.jpg` (quando há trocas por câmera) ou `planos_*.jpg` — classifique **cada cena/plano** (tabelas `camera.cenas` / `planos` do analise.json) num layout: rosto, split, card, print/evidência, gráfico, b-roll, texto cheio, arquivo/foto, tela diegética… Calcule % do tempo por layout e o padrão de alternância (ex.: "2 gráficos e volta ao rosto").
3. `cortes_*.jpg` e `picos_*.jpg` — tipo de cada transição (seco, punch-in, whip, mergulho, flash, fade, slide, máscara, glitch) e o que entra animado logo depois. Compare com o tipo que o script deu a cada pico.
4. `folhas/picos/*_grade.png` — confira cada linha de texto medida (posição, tamanho, peso, cor) e corrija o que o script errou (foto com grafismos pode virar "texto"; acento e aspas aumentam a altura). Procure profundidade de campo, textura e a superfície do texto.
5. `legendas_*.jpg` + palavras listadas no analise.md — palavras por vez, sincronia, caixa, destaque, entrada/saída.
6. **Movimento:** descreva as entradas típicas com o [vocabulário de movimento](../motion-design/references/vocabulario.md) (curva, cascata, máscara, impacto, fio condutor) e a câmera (tabela "Câmera": tipo, duração, escala, para onde vai) — vira o bloco `movimento` da receita.
7. **De perto** com `quadro.mjs`, em 3–6 instantes representativos (legenda no rosto, legenda no split/gráfico, título, card, final):
   ```bash
   node scripts/quadro.mjs <video> <t> --grade --texto --cor "x,y;x,y" --recorte x,y,l,a --seq 0.5
   ```
   `--grade` → posição e tamanho (converta com as fórmulas do checklist) · `--texto` → linhas de texto medidas · `--cor` → hex do texto, destaque, fundo · `--recorte` → identificar a fonte, contorno, sombra, textura · `--seq` → contar quadros de uma entrada (duração e ease).
8. Transcrição (`analise/transcript.json`) — fórmula do gancho (pergunta, proibição, número, promessa), frases curtas ou longas, CTA.

Registre cada achado em `referencias/estilos/<nome>/evidencias.md`: `[observado] legenda Inter-like 800, caixa normal, y≈1350 no rosto — quadro_8s20_grade.png`.

Com 2–3 referências: analise todas e mantenha na receita **o que se repete** (invariantes); o que muda vira faixa (ex.: plano médio 1,8–2,4 s) ou fica de fora.

## 5. Separar estilo × conteúdo × identidade
| Copiar (estilo) | Não copiar (conteúdo) | Trocar pela do aluno (identidade) |
|---|---|---|
| ritmo, tamanho dos planos, corte de silêncio · gramática de layouts · anatomia da legenda · hierarquia tipográfica · tipos e tempos de animação · transições · uso de SFX · tratamento de imagem (claro/escuro, contraste) · fórmula de gancho e de CTA | assunto, falas, dados, número de itens da lista, prints e produtos citados | logo, @, mascote, rosto, bordões, música e SFX da referência, ícones/ilustrações próprios dele, cores de marca (mantenha o **papel** da cor, use a cor do aluno), fontes pagas (→ equivalente livre) |

Nunca coloque imagem, áudio, música ou asset da referência no vídeo do aluno. A referência é só estudo.

## 6. Escrever a receita
Copie [references/modelo-estilo.md](references/modelo-estilo.md) para `estilos/<nome>.md` e preencha **todos** os campos: bloco YAML com os números (é o que o `editar-video` executa) + texto com as regras de decisão (quando usar cada layout, o que nunca fazer). Profundidade esperada: veja `estilos/doc-tech.md` (documental, câmera contínua) e `estilos/editorial-tech.md` (Reels com cortes).
- Fontes: identifique pela anatomia ([references/fontes-equivalentes.md](references/fontes-equivalentes.md)) e baixe a equivalente: `node scripts/baixar-fonte.mjs "Montserrat" 800,900`.
- Cores: registre o hex **medido** de cada papel (fundo claro, fundo escuro, texto, destaque 1/2) e diga qual papel da `marca/design.md` substitui cada um.
- Tempos em segundos; posições e tamanhos em px de 1080×1920. Tamanho de texto: diga se o número é **altura das maiúsculas** (o que se mede no quadro) ou **corpo CSS** (`font-size` ≈ maiúscula ÷ 0,72). Confundir os dois deixa o texto 28% menor.
- **CSS testado é obrigatório**: a seção "Como implementar no HyperFrames" traz o CSS (e o GSAP, se houver movimento) de cada efeito identificado: sombras, bordas, scanlines de CRT, desfoque de profundidade, filtro P&B, brilho, grão, vinheta, máscara, câmera virtual. "Testado" quer dizer que você renderizou o trecho numa composição de rascunho em `referencias/estilos/<nome>/teste-css/` (`npx hyperframes init`, depois `npx hyperframes snapshot --at <t> --describe false`) e o comparou com o quadro da referência (`node scripts/lado-a-lado.mjs`). Efeito que não passou pelo snapshot fica marcado `# proposto, não testado`.

### Referência horizontal (16:9 ou 4:3) → vertical (9:16)
Não recorte o meio do quadro: remonte o layout para 1080×1920 e registre cada mudança em "Adaptações".
- **Zona segura**: todo texto e todo elemento essencial entre x 110–930 e y 470–1430. Isso cobre o corte 4:5 do feed e a interface do Reels. Fora dela, só o cenário continuando (foto estendida, fundo desfocado, vinheta), nunca faixa vazia.
- **Empilhe o que estava lado a lado**: foto à esquerda + texto à direita vira foto em cima e texto embaixo (ou o contrário), na ordem em que o olho lia. Uma foto/print 4:3 com 820 px de largura ocupa 615 px de altura e cabe na zona com espaço para 1–2 linhas de texto.
- **Tamanhos**: use os números "em 1080" do `analise.md` (mesma proporção em relação ao lado menor) e confira a largura de cada linha: precisa caber em **820 px**. Se não couber, quebre a linha ou reduza o grupo inteiro, mantendo a proporção entre hero, título e legenda.
- **Câmera**: mantenha o tipo, a duração e a curva de cada movimento (whip, mergulho, push lento). Com os elementos empilhados, um pan horizontal da referência costuma virar vertical. O ponto para onde a câmera mergulha precisa terminar dentro da zona segura.
- **Elementos de cena** (personagem desfocado, monitor, lousa) podem sair pela borda: é cenário. O texto nunca sai.

## 7. Provar (obrigatório antes de dizer "pronto")
1. Peça um vídeo curto do aluno (10–30 s falando) em `entrada/`. Sem vídeo, entregue a receita marcada como **não validada**.
2. Edite com a skill `editar-video` no estilo novo, em `projetos/<nome>-teste/`, incluindo a revisão (skill `revisar-video`).
3. Meça o teste e compare:
   ```bash
   node scripts/analisar-referencia.mjs projetos/<nome>-teste/render.mp4
   node scripts/comparar-analises.mjs referencias/estilos/<nome>/analise/analise.json projetos/<nome>-teste/analise/analise.json
   node scripts/lado-a-lado.mjs referencias/estilos/<nome>/video.mp4 projetos/<nome>-teste/render.mp4 "<tRef:tTeste,...>" projetos/<nome>-teste/lado-a-lado.jpg
   ```
   Escolha pares equivalentes: gancho, legenda no rosto, cada layout, um card/gráfico, o final. Em motion que recria a referência no mesmo tempo, compare direto na composição: `npx hyperframes snapshot --at <tempos> --against referencias/estilos/<nome>/video.mp4 --describe false`.
4. Para cada ✗ e cada diferença visível: **erro de reprodução** → corrija a receita e/ou a composição; **adaptação intencional** (marca do aluno, material diferente, ex.: gravação noturna, sem prints) → registre em "Adaptações". Repita até 3 rodadas.
5. Critério de pronto: ritmo (plano médio, cortes/min, trocas de cena por câmera/min, gancho, animações/min) dentro da tolerância; cada `alerta_estilo` da referência reproduzido (ex.: a cor acende na mesma palavra); anatomia da legenda igual no lado a lado; todos os layouts principais presentes; cores nos papéis certos. Registre a tabela final na seção "Validação" da receita.

## 8. Entregar
Diga ao aluno, curto: o DNA do estilo em 5 linhas, o vídeo de teste (`projetos/<nome>-teste/` → copie o MP4 final para `saida/`), o placar da comparação, o que foi adaptado e por quê, e como usar: **"edita entrada/x.mp4 no estilo <nome>"**. Guarde o teste na biblioteca: `node scripts/biblioteca.mjs guardar projetos/<nome>-teste --estilo <nome> --titulo "Teste do estilo <nome>" [--referencia <ID>]`.
