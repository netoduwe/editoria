---
name: editar-video
description: Edita um vídeo falado do aluno (Reels, Shorts, TikTok, aula, anúncio) do bruto ao MP4 final — transcreve, escolhe as melhores tomadas, corta, monta no HyperFrames num estilo da pasta estilos/, legenda, masteriza e entrega em saida/. Use quando o aluno pedir "edita", "corta", "legenda", "deixa bonito" ou entregar um vídeo em entrada/.
---

# Editar vídeo (bruto → MP4 pronto)

Siga as etapas em ordem. Trabalhe em `projetos/<nome>/` (nome curto, sem espaço, a partir do arquivo). Tempos sempre explícitos: **bruto** (segundos do arquivo original) ou **timeline** (segundos do vídeo editado).

## 1. Entender o material
```bash
node scripts/verificar.mjs entrada/<arquivo> --rapido
```
Anote orientação real (iPhone grava girado: confie em `resolucao_exibida`), fps, duração. Leia `marca/design.md` e a receita `estilos/<estilo>.md`. Se a receita começa com bloco YAML, **ele é a especificação**: tamanhos, posições, fontes, tempos de animação, cores por papel e os alvos de ritmo (`plano_medio_s`, `cortes_por_minuto`, `animacoes_por_minuto`, `pausa_maxima_mantida_s`). Cores com `usar: marca.<papel>` vêm de `marca/design.md`.

## 2. Transcrever e ler como roteiro
```bash
npx hyperframes transcribe entrada/<arquivo> --language pt --dir projetos/<nome>
node scripts/transcricao.mjs projetos/<nome>/transcript.json --video entrada/<arquivo>
```
O relatório marca `⟲` (frase refeita depois) e `🔉` (bem mais baixa que as tomadas boas = ensaio, fala virada ou fora do microfone). Silêncios > 3 s podem esconder conversa de bastidor.

## 3. Decidir o corte
- Para cada frase do roteiro, use a **última tomada completa** com volume normal. Descarte `🔉`, frases abortadas, instruções de quem está gravando ("fala de novo", "vai"), "ah tá" e afins.
- Mantenha a ordem lógica do discurso. Não junte meia frase de um take com meia de outro, a menos que a emenda caia numa pausa natural.
- Folga: comece ~0,12 s antes da primeira palavra e termine ~0,15 s depois da última. Não apague pausas internas < 0,35 s (é respiração/ritmo) — **exceto** se o estilo pedir corte mais seco (`pausa_maxima_mantida_s` menor): aí corte as pausas maiores que esse valor, sempre em silêncio real, nunca no meio de palavra.
- **Pergunte ao aluno** só se houver escolha de conteúdo real: dois finais/CTAs diferentes, duas versões de uma informação (data, preço), ou algo que pareça errado. Ofereça as opções em uma mensagem. Se forem dois CTAs igualmente válidos, pode entregar as duas versões.

Escreva `projetos/<nome>/edl.json`:
```json
{ "fps": 30, "segmentos": [ { "id": "hook", "inicio": 4.85, "fim": 9.80, "texto": "frase exata" } ] }
```

## 4. Cortar e conferir o corte
```bash
node scripts/cortar.mjs entrada/<arquivo> projetos/<nome>/edl.json projetos/<nome>/corte.mp4
npx hyperframes transcribe projetos/<nome>/corte.mp4 --language pt --dir projetos/<nome>/corte-transcricao
node scripts/transcricao.mjs projetos/<nome>/corte-transcricao/transcript.json --video projetos/<nome>/corte.mp4
```
A transcrição do corte precisa bater com o roteiro escolhido, sem palavra cortada no começo ou no fim de trecho e sem sobra de outro take. Se algo vazou, ajuste o `edl.json` e corte de novo. Essa transcrição (tempos de **timeline**) é a base das legendas e das animações.

## 5. Montar no HyperFrames
```bash
npx hyperframes init projetos/<nome>/composicao --non-interactive --example=blank --skill=general-video
```
- Copie para `composicao/assets/`: `corte.mp4`, as fontes de `fontes/` que o estilo usa, a logo de `marca/logo/`. Copie `marca/design.md` para `composicao/design.md` (o HyperFrames trata como verdade da marca).
- Carregue a skill `hyperframes` e siga `general-video` em modo automação, sem storyboard. Monte exatamente o que a receita do estilo descreve.
- Áudio: o vídeo `corte.mp4` leva a voz (`data-has-audio="true"`). SFX só nos momentos que o estilo pede; procure-os com a skill `media-use`. Sem música, a menos que o aluno peça ou a marca defina.
- Legendas: fragmentos de 1–4 palavras, quebrando em pontuação/pausa; artigo e preposição grudam na palavra seguinte; nunca um fragmento só com "a", "de", "que".
- Recorte de pessoa (estilos com cabeça sobre painel): `npx hyperframes remove-background composicao/assets/corte.mp4 -o composicao/assets/pessoa.webm`.

## 6. Revisar antes de renderizar
```bash
cd projetos/<nome>/composicao && npx hyperframes check
npx hyperframes snapshot --at <meio de cada cena, separados por vírgula>
```
Se o estilo tem alvos de ritmo, confira no corte/composição: duração média dos planos e frequência de entradas animadas devem ficar perto do alvo (±25%); se ficar longe, adicione trocas de layout ou entradas nas palavras-chave. `check` sem erros (avisos de organização tudo bem). O `snapshot` imprime onde salvou as imagens e uma `contact-sheet.jpg`: **abra e olhe**: texto cortado, legenda em cima do rosto, cor ilegível, elemento sobrando, cena vazia, primeiro e último quadro. Corrija e repita.

## 7. Renderizar e entregar
```bash
npx hyperframes render --quality delivery --fps 30 -o ../render.mp4
cd ../../.. && node scripts/masterizar.mjs projetos/<nome>/render.mp4 saida/<nome>.mp4
node scripts/verificar.mjs saida/<nome>.mp4
npx hyperframes transcribe projetos/<nome>/corte-transcricao/transcript.json --to srt -o saida/<nome>.srt
```
`verificar` precisa mostrar `decodificacao: ok` e loudness perto de −14 LUFS. Abra a folha de quadros gerada e confira começo e fim.

Responda ao aluno com: caminho do vídeo, duração, estilo, o que você cortou/decidiu, e como pedir ajustes ("muda a cor da legenda", "tira o card do minuto 0:12"). Avise que ele deve assistir com som antes de publicar.
