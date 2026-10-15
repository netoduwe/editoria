# Vocabulário de movimento

Receitas curtas que funcionam em Reels e anúncios. No HyperFrames tudo vive numa timeline GSAP pausada; a API, os blueprints de cena e os 24 efeitos de texto prontos estão na skill `hyperframes-animation`. Este arquivo diz **o que** usar e **quando**.

## Curvas por papel
| Papel | Curva (ease) | Duração típica |
|---|---|---|
| Entrada de texto ou objeto | `expo.out`; `back.out(1.6–2.6)` quando quer um leve "passa e volta" | 0,3–0,6 s |
| Câmera e grandes deslocamentos | `expo.inOut` | 0,6–1,2 s |
| Saída | `power3.in` ou `expo.in` | 0,25–0,45 s |

Nada linear em elemento de leitura (linear só em rotação contínua ou textura de fundo). Use 2–3 curvas por cena, não uma só.

## Texto
- **Palavras sobem por máscara:** cada palavra dentro de um invólucro com `overflow: hidden`, indo de `yPercent: 115` a `0`, em cascata de 0,06–0,08 s.
- **Letras:** `scaleY` + desfoque → nítido, em cascata a partir do centro.
- **Itálico "escrito à mão":** uma máscara em gradiente corre da esquerda para a direita revelando a palavra.
- **Tracking que fecha:** espaçamento de letras de largo para normal. Anime em px, nunca em `em`.

## Ênfase e impacto
- **Brilho:** uma passada de luz por objeto. Nunca pulsando enquanto a pessoa lê.
- **Impacto:** o elemento entra grande (escala 2,6 → 1), com flash curto (até 0,45 de opacidade), tremor leve e efeito sonoro — tudo no mesmo quadro.
- **Números:** odômetro — uma coluna de dígitos numa janela com `overflow: hidden`; a coluna desliza até o valor.
- **Quique:** squash & stretch no pouso (`scaleY` 0,8 / `scaleX` 1,12).

## Câmera e profundidade
- **Câmera como objeto:** posição, zoom e inclinação animados num objeto da timeline e aplicados ao container da cena. Recuo no final revela a frase inteira.
- **Pulso por batida** (+1% de escala) quando há música; tremor e aberração cromática só nos impactos, sumindo em ~0,45 s.
- **Objetos com espessura:** algumas camadas empilhadas com `translateZ` e `perspective` na cena.

## Transições
- A cena seguinte começa a entrar 0,05–0,1 s **antes** do corte, por baixo da transição: nunca um quadro vazio.
- Cenas podem se sobrepor ~0,15 s enquanto a anterior sai.
- Transição sempre motivada pelo fio condutor (fita que varre, card que gira, câmera que atravessa um objeto). Evite transições "de catálogo" sem motivo.

## Demonstração de produto ou de chat com IA
Campo de digitação com caracteres aparecendo e zoom no campo enquanto digita; recuo ao enviar; "digitando…"; resposta palavra a palavra; checklist que se marca. Sem caixa de fundo pesada.

## Para descrever uma referência (copiar-estilo)
Ao analisar o movimento de uma referência, use estes nomes: curva (rápida e assenta = `expo/power.out`; passa e volta = `back.out`), cascata (segundos entre itens), máscara ou fade, impacto, odômetro, fio condutor. Conte os quadros de cada entrada com `node scripts/quadro.mjs <video> <t> --seq 0.5`. Isso vira o bloco `movimento` da receita em `estilos/`.
