---
name: editar-video
description: Edita um vídeo falado do aluno (Reels, Shorts, TikTok, aula, anúncio) do bruto ao MP4 final — transcreve, escolhe as melhores tomadas, corta pela energia da voz, monta no HyperFrames num estilo da pasta estilos/ (com o template do estilo, quando existe), insere B-roll da get-brolls como cutaways sincronizados com a fala, mostra a prancha das cenas para aprovação, legenda, masteriza, entrega em saida/ e guarda na biblioteca. Use quando o aluno pedir "edita", "corta", "legenda", "deixa bonito", mandar um vídeo (em entrada/ ou o caminho de qualquer pasta) ou colar um pedido da biblioteca ("edita no estilo…", "com o template…", "usa o meu projeto … como base").
---

# Editar vídeo (bruto → MP4 pronto)

Siga as etapas em ordem. Trabalhe em `projetos/<nome>/` (nome curto, sem espaço, a partir do arquivo). Tempos sempre explícitos: **bruto** (segundos do arquivo original) ou **timeline** (segundos do vídeo editado).

O bruto pode estar em `entrada/` ou em qualquer pasta (Downloads, Google Drive no computador): use o caminho como está, entre aspas, sem copiar nem mover. Nunca escreva ao lado dele. Se ele estiver fora do kit, avise que o projeto guardado depende desse arquivo para renderizar de novo.

## 1. Entender o material
```bash
node scripts/verificar.mjs "<bruto>" --rapido
```
Anote orientação real (iPhone grava girado: confie em `resolucao_exibida`), fps, duração. **Abra a folha de quadros**: objetos em cena (placa escrita, produto, tela, papel na mão) mudam o layout e onde vai a legenda — a legenda nunca cobre o objeto nem o rosto.

Leia `marca/design.md` e a receita `estilos/<estilo>.md`. Se a receita começa com bloco YAML, **ele é a especificação**: tamanhos, posições, fontes, tempos de animação, cores por papel e os alvos de ritmo (`plano_medio_s`, `cortes_por_minuto`, `animacoes_por_minuto`, `pausa_maxima_mantida_s`). Cores com `usar: marca.<papel>` vêm de `marca/design.md`. Se existir `templates/<estilo>/`, o passo 5 usa o template.

Se o pedido veio da biblioteca, ele cita um ID, um template ou `projetos/<nome>`:
- **Referência com estilo** ("edita … no estilo X") → use `estilos/X.md`; não precisa baixar a referência.
- **Template** ("edita … com o template X") → passo 5 com `templates/X/`.
- **Projeto como base** ("usa o meu projeto … como base") → crie um projeto novo e copie para ele o `cenas.json` (ou a `composicao/`, sem os vídeos de `assets/`) do projeto base. O corte e as legendas são refeitos com o vídeo novo; layout, cores, tipografia e movimento ficam iguais. Nunca altere o projeto base.

## 2. Transcrever e ler como roteiro
```bash
npx hyperframes transcribe "<bruto>" --language pt --dir projetos/<nome>
node scripts/transcricao.mjs projetos/<nome>/transcript.json --video "<bruto>"
```
O relatório marca `⟲` (frase refeita depois) e `🔉` (bem mais baixa que as tomadas boas = ensaio, fala virada ou fora do microfone). Silêncios > 3 s podem esconder conversa de bastidor.

## 3. Decidir o corte
- Para cada frase do roteiro, use a **última tomada completa** com volume normal. Descarte `🔉`, frases abortadas, instruções de quem está gravando ("fala de novo", "vai"), "ah tá" e afins.
- Mantenha a ordem lógica do discurso. Não junte meia frase de um take com meia de outro, a menos que a emenda caia numa pausa natural.
- **Os tempos da transcrição não servem para cortar**: ela estica a última palavra de cada frase (até 1 s) e às vezes adianta o início. Meça pela energia da voz nos trechos escolhidos:
  ```bash
  node scripts/pausas.mjs "<bruto>" 13.3-29.3 42.2-48.6 --min 0.25
  ```
  Use o **corte sugerido** (0,12 s antes da voz e 0,14 s depois) e as **pausas** listadas. Não apague pausas < 0,35 s (respiração/ritmo) — **exceto** se o estilo pedir corte mais seco (`pausa_maxima_mantida_s` menor): aí divida o trecho nas pausas maiores que esse valor, usando o "para cortar" do script.
- **Pergunte ao aluno** só se houver escolha de conteúdo real: dois finais/CTAs diferentes, duas versões de uma informação (data, preço), ou algo que pareça errado. Ofereça as opções em uma mensagem. Se forem dois CTAs igualmente válidos, pode entregar as duas versões.

Escreva `projetos/<nome>/edl.json`:
```json
{ "fps": 30, "segmentos": [ { "id": "hook", "inicio": 4.85, "fim": 9.80, "texto": "frase exata" } ] }
```

## 4. Cortar e conferir o corte
```bash
node scripts/cortar.mjs "<bruto>" projetos/<nome>/edl.json projetos/<nome>/corte.mp4
npx hyperframes transcribe projetos/<nome>/corte.mp4 --language pt --dir projetos/<nome>/corte-transcricao
node scripts/transcricao.mjs projetos/<nome>/corte-transcricao/transcript.json --video projetos/<nome>/corte.mp4
```
A transcrição do corte precisa bater com o roteiro escolhido, sem palavra cortada no começo ou no fim de trecho e sem sobra de outro take. Se algo vazou, ajuste o `edl.json` e corte de novo. Essa transcrição (tempos de **timeline**) é a base das legendas e das animações. Palavras que a transcrição errou se corrigem no `corrigir` do `cenas.json` (vale para a legenda e para o SRT).

Se o estilo tem cabeça sobre o painel, já comece o recorte da pessoa **em segundo plano** (leva ~15 s por segundo de vídeo):
```bash
npx hyperframes init projetos/<nome>/composicao --non-interactive --example=blank --skill=general-video
mkdir -p projetos/<nome>/composicao/assets && cp projetos/<nome>/corte.mp4 projetos/<nome>/composicao/assets/
npx hyperframes remove-background projetos/<nome>/composicao/assets/corte.mp4 -o projetos/<nome>/composicao/assets/pessoa.webm
```

## 5. Montar no HyperFrames
**Com template** (`templates/<estilo>/` existe): escreva `projetos/<nome>/cenas.json` seguindo `templates/<estilo>/README.md` (exemplo completo em `exemplo-cenas.json`) e rode:
```bash
node templates/<estilo>/montar.mjs projetos/<nome>
```
O template aplica a marca, legendas sincronizadas, efeitos sonoros próprios (sem depender de login) e as regras de revisão (nenhuma tela começa vazia). Trilha só se o aluno pedir: campo `musica` no `cenas.json` — o template encaixa as batidas (trocas de cena, pulsos e flashes no tempo) e abre espaço para a voz com o carve do HyperFrames. Avise que música de artista em **anúncio pago** costuma ser reprovada ou silenciada e entregue também a versão sem música (ela serve para conferir a mistura com `node scripts/voz-musica.mjs`). Para mudar algo, edite `cenas.json` e rode de novo — nunca edite o `index.html` gerado.

**Sem template**: crie a composição com `npx hyperframes init` (como acima), copie para `composicao/assets/` o `corte.mp4`, as fontes de `fontes/` e a logo de `marca/logo/`, e `marca/design.md` como `composicao/design.md`. Carregue a skill `hyperframes` e siga `general-video` em modo automação, sem storyboard, montando exatamente o que a receita descreve.
- Áudio: a voz vem do corte; SFX só onde o estilo pede, cada um preso a um evento da tela com o pico no quadro do evento. A skill `media-use` só busca SFX com login no HeyGen; sem ele, gere efeitos curtos e graves com o FFmpeg (veja como em `templates/editorial-tech/montar.mjs`). Sem música, a menos que o aluno peça ou a marca defina.
- Legendas: fragmentos de 1–4 palavras, quebrando em pontuação/pausa; artigo e preposição grudam na palavra seguinte; nunca um fragmento só com "a", "de", "que".

### B-roll como inserts (get-brolls)
Quando o pedido ou o roteiro pede imagem de apoio (fato, notícia, marca, pessoa, produto, dado literal; veja `AGENTS.md`), colete com a skill get-brolls **depois do passo 4**, porque os tempos vêm da transcrição do corte.
1. **Coleta** em `projetos/<nome>/broll/`, separada da composição (a get-brolls grava `BRIEF.md` e `RULES.md` na raiz do projeto dela, e eles não podem misturar com os da composição). Use caminhos absolutos e formato vertical:
   ```bash
   python "<kit>/.agents/skills/get-brolls/scripts/gb.py" init-brief --project "<kit>/projetos/<nome>/broll"
   python "<kit>/.agents/skills/get-brolls/scripts/gb.py" init-rules --format reels --force --project "<kit>/projetos/<nome>/broll"
   ```
   Um beat por trecho de fala que precisa de apoio, com o `id` curto do assunto (ex.: `lancamento-iphone`) e a frase exata. Anote no seu plano o tempo de **timeline** de cada beat (início da palavra que cita o fato, em `corte-transcricao/transcript.json`). Siga a `SKILL.md` da get-brolls até o fim: prévias, **aprovação do aluno no Storyboard ou no chat** (nunca se autoaprove), `permit`, `fetch`, `verify` e `deliver`.
2. **O que chega:** `projetos/<nome>/broll/entrega/NN-<beat>-<assunto>/` com o `.mp4` já cortado no trecho aprovado, a folha de quadros e o `ORIGEM.md` (fonte, autor, trecho, direitos). A mídia entregue é um hardlink **somente leitura** de `broll/brolls/clips/`: não edite nem mova; **copie**.
3. **Para a composição:** copie cada corte para `composicao/assets/broll/<beat>.mp4` (o HyperFrames só enxerga o que está dentro da pasta da composição). Com template: o `editorial-tech` ainda não tem cena de B-roll, e o `index.html` que o `montar.mjs` gera não se edita à mão. Num vídeo que precisa de B-roll, monte sem template ou avise o aluno que o template ainda não aceita inserts.
4. **Insert sincronizado com a fala:** um `<video>` por beat, numa trilha acima do vídeo do aluno e abaixo da legenda:
   ```html
   <video id="broll-lancamento-iphone" class="clip" src="assets/broll/lancamento-iphone.mp4"
     data-start="12.34" data-duration="2.2" data-media-start="0" data-track-index="5" muted playsinline
     style="position:absolute;left:0;top:0;width:1080px;height:1920px;object-fit:cover;z-index:20"></video>
   ```
   - `data-start` = início da palavra que cita o fato na transcrição do corte, menos ~0,1 s (a imagem chega junto com a palavra). `data-duration` = até o fim da frase, 1,5–3 s, nunca mais que o corte entregue. `data-media-start` escolhe o momento dentro do corte (0 = início do trecho aprovado).
   - **Cutaway, não corte:** o insert é `muted` e a voz do aluno continua por baixo. Só use o som do B-roll (`data-has-audio="true"` sem `muted`, com a voz abaixada no trecho) se o aluno pediu "o X falando Y".
   - Enquadramento: material 16:9 num vídeo 9:16 com `object-fit:cover` corta as laterais. Se o assunto sair do quadro, use `object-fit:contain` sobre o fundo da marca, ou um card com o vídeo em ~860 px de largura dentro da faixa segura. Legenda e textos ficam por cima (z-index maior) e dentro da faixa segura.
   - Entrada e saída curtas (corte seco, ou fade/escala de 0,15–0,25 s), sem cobrir o rosto em mais de 3 s seguidos. Confira se o `data-duration` da composição raiz cobre o fim de cada insert.
5. **Créditos:** se o `ORIGEM.md` pede atribuição, inclua o crédito (autor/fonte) na entrega ao aluno para a legenda do post, ou num rótulo discreto no próprio insert. Nunca use um corte sem `ORIGEM.md`.

Os inserts entram na prancha do passo 6 como cenas (mostre o quadro do meio de cada um) e passam pela revisão do passo 7 como qualquer troca de cena.

## 6. Prancha para aprovação (antes de qualquer render)
Edição com cenas gráficas (template, cards, telas, split) **para aqui** até o aluno aprovar. Edição só com legenda pode seguir direto, a menos que o aluno peça a prancha.
```bash
cd projetos/<nome>/composicao
npx hyperframes snapshot --at <meio de cada cena, separados por vírgula> --describe false -o ../prancha
```
Mostre ao aluno a `contact-sheet.jpg` da prancha e 1 linha por cena (tempo, o que aparece, qual fala). Ajuste o `cenas.json` até ele dizer "aprovado". A prancha é a própria edição: nunca mostre peças que não vão estar no vídeo.

## 7. Revisar antes de renderizar
Siga os passos 1–3 da skill `revisar-video`: `npx hyperframes check --at-transitions` sem erros, quadros em volta de cada troca de cena (`snapshot --describe false`: texto cortado, legenda em cima do rosto, cor ilegível, elemento sobrando, tela vazia, primeiro e último quadro) e os tempos de leitura. Se o estilo tem alvos de ritmo, a duração média dos planos e a frequência de entradas animadas devem ficar a ±25% do alvo. Com template e cabeça sobre o painel, rode o `check` com a composição montada `--sem-cabeca` (o check trava com vídeo transparente) e depois monte de novo sem a opção.

## 8. Renderizar e entregar
Abra o preview sem perguntar (`npx hyperframes preview --background`) — o aluno pode ajustar texto e tempo ali — e renderize:
```bash
npx hyperframes render --quality delivery --fps 30 -o ../render.mp4
cd ../../.. && node scripts/masterizar.mjs projetos/<nome>/render.mp4 saida/<nome>.mp4
node scripts/verificar.mjs saida/<nome>.mp4 --guias
npx hyperframes transcribe projetos/<nome>/corte-transcricao/transcript.json --to srt -o saida/<nome>.srt
```
Se existir `corte-transcricao/transcript.corrigido.json` (o template grava quando há `corrigir`), use ele no SRT. `verificar` precisa mostrar `decodificacao: ok` e `alertas` vazio. Abra a folha com guias (`saida/<nome>.guias.jpg`): tudo legível em tamanho de celular e dentro da faixa vermelha (passos 4–5 da skill `revisar-video`).

## 9. Guardar na biblioteca
```bash
node scripts/biblioteca.mjs guardar projetos/<nome> --titulo "<o assunto do vídeo>" --estilo <estilo> --notas "<traço 1>; <traço 2>" [--referencia <ID da biblioteca>] [--pasta "<pasta que o aluno pediu>"]
```
Gera capa e prévia leve (540 px) e o projeto aparece em **Meus projetos** no feed (`node scripts/biblioteca.mjs`). Rode de novo a cada nova versão aprovada. Se o aluno pedir para liberar espaço: `node scripts/biblioteca.mjs compactar projetos/<nome>` (apaga só corte, recorte da pessoa e render, que dá para refazer; o vídeo final em `saida/` e a prévia ficam).

Responda ao aluno com: caminho do vídeo, duração, estilo, o que você cortou/decidiu, que ele já está na biblioteca, e como pedir ajustes ("muda a cor da legenda", "tira o card do minuto 0:12"). Avise que ele deve assistir com som antes de publicar.
