---
name: revisar-video
description: Revisão obrigatória antes de entregar qualquer vídeo do kit (edição falada, motion ou teste de estilo) — confere a composição, as transições quadro a quadro, a faixa segura em tamanho de celular, os tempos de leitura, contraste, flashes, efeitos sonoros e o arquivo final. Use no fim das skills editar-video, motion-design e copiar-estilo, ou quando o aluno pedir "revisa", "confere", "tá certo?".
---

# Revisar antes de entregar

Ninguém entrega sem olhar. Siga a ordem, corrija o que aparecer e repita o passo até passar. Uma mudança pedida para "uma cena" pode quebrar outra: depois de qualquer correção, refaça os passos 1 e 2 inteiros.

## 1. Composição (antes do render)
```bash
cd projetos/<nome>/composicao      # motion: cd projetos/<nome>
npx hyperframes check --at-transitions
```
Zero erros. O `check` já mede texto vazando, contraste (WCAG AA) e, com `--at-transitions`, amostra cada início e fim de animação — é onde aparecem sobreposições e quadros vazios.

## 2. Quadros: cenas e transições
```bash
npx hyperframes snapshot --at <meio de cada cena>,<0,1 s antes e depois de cada troca de cena> --describe false
```
Use **sempre** `--describe false`: sem ele, se o computador tiver `GEMINI_API_KEY`, os quadros do aluno vão para o Google (regra 2). Abra a `contact-sheet.jpg` e procure:
- texto cortado, fora da faixa segura ou em cima do rosto/boca;
- quadro vazio ou "piscada" na troca de cena (a cena seguinte deve começar 0,05–0,1 s antes do corte, por baixo da transição);
- elemento que "saiu" mas ficou parado na borda (a saída termina fora da tela **e** com opacidade 0);
- duas coisas disputando o olho ao mesmo tempo (uma ação dominante por vez);
- legibilidade: nada abaixo de 26 px, texto principal ≥ 56 px, contraste bom.
Para ver o caminho de um elemento ao longo do tempo: `npx hyperframes keyframes --shot caminho.png --selector "<seletor css>"`. Para detalhe de tipografia: `npx hyperframes snapshot --at <t> --zoom "<seletor>" --describe false`.

## 3. Leitura e segurança
- Quadro 0 já tem conteúdo (rosto + legenda, ou título): nunca tela preta.
- Gancho: primeira palavra legível antes de 0,6 s; título legível desde o quadro 0 e por ≥ 1,3 s.
- Palavra em foco ≥ 0,25 s; frase de 6–8 palavras ≥ 1,5 s; CTA final parado ≥ 1 s; último quadro legível (o Reels recomeça em loop).
- Flashes: no máximo 3 por segundo. Tremor de câmera só em impacto (≤ 25 px, some em ≤ 0,5 s).
- Entende sem som? A maioria assiste mudo: a mensagem precisa estar no texto.
- Nenhum número, data ou promessa que não foi dito no vídeo ou dado pelo aluno (regra 4).
- Ritmo: se o estilo tem alvos (`plano_medio_s`, `animacoes_por_minuto`), confira que ficaram a ±25%.

## 4. Arquivo final
```bash
node scripts/verificar.mjs saida/<nome>.mp4 --guias
```
- `decodificacao: ok` e `alertas` vazio (resolução, fps, faixa de áudio, loudness −14 ±1,5 LUFS, pico ≤ −1 dBTP).
- Abra `saida/<nome>.guias.jpg`: 8 quadros em tamanho de celular com a faixa segura em vermelho (x 110–930, y 470–1430). Texto, logo, preço e CTA ficam dentro dela; tudo precisa ser legível nesse tamanho.

## 5. Áudio (o que dá para conferir sem ouvir)
- Cada efeito sonoro nasce de um evento visual (entrada de card, impacto, troca de cena). Nada "solto" ou herdado de outro projeto.
- O pico do som cai no quadro do evento: o whoosh termina no corte, o impacto começa no impacto.
- Um efeito por grupo de eventos, não um por elemento; efeitos 10–15 dB abaixo da voz ou da música.
- Masterizado com `node scripts/masterizar.mjs` (−14 LUFS / −1 dBTP).

## 6. Liberar
Só entregue com 1–5 ok. Na resposta, diga em uma linha o que você conferiu e o que não conseguiu conferir (você não ouve o áudio: peça ao aluno para assistir com som).
